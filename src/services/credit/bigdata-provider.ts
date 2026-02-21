import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { FraudRisk } from '@prisma/client';

interface BigDataResponse {
  Status: { Code: number; Message: string };
  Result: Array<{
    MatchKeys: string;
    Data: Record<string, unknown>;
  }>;
}

interface BigDataCreditResult {
  score: number;
  fraudRisk: FraudRisk;
  existingDebts: number;
  rawData: Record<string, unknown>;
}

/**
 * BigDataCorp API Integration
 *
 * Docs: https://docs.bigdatacorp.com.br
 *
 * Auth: Bearer token via AccessToken header
 * Base URL: https://plataforma.bigdatacorp.com.br
 *
 * To get started:
 * 1. Create account at bigdatacorp.com.br
 * 2. Get your API token from the dashboard
 * 3. Set BIGDATA_API_KEY=<your-token>
 * 4. Set BIGDATA_ENABLED=true
 */
export class BigDataCorpProvider {
  name = 'bigdatacorp';
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = env.BIGDATA_API_URL;
    this.token = env.BIGDATA_API_KEY;
  }

  /**
   * Run a comprehensive credit check using BigDataCorp datasets
   */
  async checkCredit(cpf: string): Promise<BigDataCreditResult> {
    const datasets = await Promise.allSettled([
      this.queryDataset(cpf, 'credit_risk'),
      this.queryDataset(cpf, 'financial_data'),
      this.queryDataset(cpf, 'basic_data'),
    ]);

    const creditRisk = datasets[0].status === 'fulfilled' ? datasets[0].value : null;
    const financialData = datasets[1].status === 'fulfilled' ? datasets[1].value : null;
    const basicData = datasets[2].status === 'fulfilled' ? datasets[2].value : null;

    // Extract credit score
    const score = this.extractScore(creditRisk);

    // Extract existing debts
    const existingDebts = this.extractDebts(financialData);

    // Determine fraud risk based on available data
    const fraudRisk = this.determineFraudRisk(basicData, score);

    logger.info(
      { cpf: `***${cpf.slice(-4)}`, score, fraudRisk, provider: this.name },
      'BigDataCorp credit check completed',
    );

    return {
      score,
      fraudRisk,
      existingDebts,
      rawData: {
        creditRisk: creditRisk?.Result || null,
        financialData: financialData?.Result || null,
        basicData: basicData?.Result || null,
      },
    };
  }

  /**
   * Validate CPF against Receita Federal
   */
  async validateCPF(cpf: string): Promise<{
    valid: boolean;
    name?: string;
    birthDate?: string;
    situation?: string;
  }> {
    try {
      const response = await this.queryDataset(cpf, 'basic_data');
      const data = response?.Result?.[0]?.Data;

      if (!data) {
        return { valid: false };
      }

      const basicInfo = data as Record<string, unknown>;
      return {
        valid: true,
        name: basicInfo.Nome as string || undefined,
        birthDate: basicInfo.DataNascimento as string || undefined,
        situation: basicInfo.SituacaoCadastral as string || undefined,
      };
    } catch (error) {
      logger.error({ error, cpf: `***${cpf.slice(-4)}` }, 'CPF validation failed');
      return { valid: false };
    }
  }

  private async queryDataset(cpf: string, dataset: string): Promise<BigDataResponse> {
    const url = `${this.baseUrl}/pessoas`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': this.token,
      },
      body: JSON.stringify({
        Datasets: dataset,
        q: `doc{${cpf}}`,
        AccessToken: this.token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BigDataCorp API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<BigDataResponse>;
  }

  private extractScore(creditData: BigDataResponse | null): number {
    if (!creditData?.Result?.[0]?.Data) return 500; // default mid-range

    const data = creditData.Result[0].Data as Record<string, unknown>;

    // BigDataCorp returns score in various fields depending on the dataset
    const possibleScoreFields = [
      'ScoreCredito', 'Score', 'CreditScore', 'RiskScore',
      'ScoreRisco', 'score_credito', 'score',
    ];

    for (const field of possibleScoreFields) {
      if (data[field] && typeof data[field] === 'number') {
        return data[field] as number;
      }
      // Some datasets nest the score
      if (typeof data[field] === 'object' && data[field] !== null) {
        const nested = data[field] as Record<string, unknown>;
        if (nested.Score && typeof nested.Score === 'number') {
          return nested.Score;
        }
      }
    }

    // If we have a risk level string, convert to score
    const riskLevel = data.NivelRisco as string || data.RiskLevel as string;
    if (riskLevel) {
      const riskScores: Record<string, number> = {
        'MUITO_BAIXO': 850, 'MUITO BAIXO': 850,
        'BAIXO': 720, 'LOW': 720,
        'MEDIO': 580, 'MEDIUM': 580, 'MÉDIO': 580,
        'ALTO': 400, 'HIGH': 400,
        'MUITO_ALTO': 280, 'MUITO ALTO': 280,
      };
      return riskScores[riskLevel.toUpperCase()] || 500;
    }

    return 500;
  }

  private extractDebts(financialData: BigDataResponse | null): number {
    if (!financialData?.Result?.[0]?.Data) return 0;

    const data = financialData.Result[0].Data as Record<string, unknown>;

    // Sum up various debt indicators
    let totalDebts = 0;

    const debtFields = [
      'TotalDividas', 'ValorTotalDividas', 'TotalPendencias',
      'ValorPendenciasFinanceiras', 'total_dividas',
    ];

    for (const field of debtFields) {
      if (data[field] && typeof data[field] === 'number') {
        totalDebts += data[field] as number;
      }
    }

    // Check for protest/negativation records
    if (Array.isArray(data.Protestos)) {
      for (const protesto of data.Protestos) {
        const p = protesto as Record<string, unknown>;
        if (p.Valor && typeof p.Valor === 'number') {
          totalDebts += p.Valor;
        }
      }
    }

    return Math.round(totalDebts * 100) / 100;
  }

  private determineFraudRisk(
    basicData: BigDataResponse | null,
    score: number,
  ): FraudRisk {
    if (!basicData?.Result?.[0]?.Data) {
      return score < 400 ? 'HIGH' : score < 600 ? 'MEDIUM' : 'LOW';
    }

    const data = basicData.Result[0].Data as Record<string, unknown>;

    // Check for death/irregular CPF status
    const situation = data.SituacaoCadastral as string;
    if (situation && !['REGULAR', 'Regular'].includes(situation)) {
      return 'HIGH';
    }

    // Check if CPF has fraud alerts
    if (data.AlertaFraude === true || data.FraudAlert === true) {
      return 'HIGH';
    }

    // Score-based fallback
    if (score < 350) return 'HIGH';
    if (score < 550) return 'MEDIUM';
    return 'LOW';
  }
}
