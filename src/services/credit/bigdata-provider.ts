import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { FraudRisk } from '@prisma/client';

/**
 * BigDataCorp API response structure
 * Each dataset returns its own status and result array
 */
interface BigDataResponse {
  Status: Record<string, Array<{ Code: number; Message: string }>>;
  Result: Array<{
    MatchKeys: string;
    Data: Record<string, unknown>;
  }>;
}

interface BigDataCreditResult {
  score: number;
  fraudRisk: FraudRisk;
  existingDebts: number;
  hasNegativo: boolean;
  isPep: boolean;
  rawData: Record<string, unknown>;
}

/**
 * BigDataCorp API Integration (Plataforma de Dados)
 *
 * Docs: https://docs.bigdatacorp.com.br
 *
 * Auth: AccessToken header
 * Base URL: https://plataforma.bigdatacorp.com.br
 * Endpoint: POST /pessoas (for CPF queries)
 *
 * Key datasets for credit origination:
 * - basic_data: CPF validation, name, DOB, cadastral status (Receita Federal)
 * - financial_data: Income estimates, net worth, tax refund history
 * - marketplace_partner_quod_credit_score_person: Quod credit score 300-1000
 * - marketplace_partner_quod_credit_risk_details_person: Negative/delinquency details
 * - kyc: PEP status, sanctions lists
 *
 * Pricing: 500 free internal queries/month. Marketplace datasets charged per call.
 * Rate limit: 5000 queries per 5 minutes per IP.
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
   * Queries: basic_data + Quod credit score + Quod negative details + KYC
   */
  async checkCredit(cpf: string): Promise<BigDataCreditResult> {
    // Query all datasets in a single API call (comma-separated)
    const datasets = [
      'basic_data',
      'marketplace_partner_quod_credit_score_person',
      'marketplace_partner_quod_credit_risk_details_person',
      'kyc',
    ].join(',');

    let response: BigDataResponse;
    try {
      response = await this.queryDatasets(cpf, datasets);
    } catch (error) {
      logger.error({ error, cpf: `***${cpf.slice(-4)}` }, 'BigDataCorp credit check failed');
      // Return safe defaults on failure
      return {
        score: 500,
        fraudRisk: 'MEDIUM',
        existingDebts: 0,
        hasNegativo: false,
        isPep: false,
        rawData: {},
      };
    }

    // Parse results — each dataset produces its own Result entry
    const results = response.Result || [];
    const dataByKey = new Map<string, Record<string, unknown>>();
    for (const r of results) {
      dataByKey.set(r.MatchKeys, r.Data);
    }

    // Extract credit score from Quod (300-1000, where 300=high risk, 1000=low risk)
    const score = this.extractQuodScore(results);

    // Check for negative/delinquency status
    const { existingDebts, hasNegativo } = this.extractNegativeData(results);

    // Check PEP and fraud risk from basic_data + kyc
    const { fraudRisk, isPep } = this.determineFraudRisk(results, score);

    logger.info(
      { cpf: `***${cpf.slice(-4)}`, score, fraudRisk, hasNegativo, isPep, provider: this.name },
      'BigDataCorp credit check completed',
    );

    return {
      score,
      fraudRisk,
      existingDebts,
      hasNegativo,
      isPep,
      rawData: {
        results: results.map((r) => ({ matchKeys: r.MatchKeys, data: r.Data })),
        status: response.Status,
      },
    };
  }

  /**
   * Validate CPF against Receita Federal via basic_data
   */
  async validateCPF(cpf: string): Promise<{
    valid: boolean;
    name?: string;
    birthDate?: string;
    situation?: string;
  }> {
    try {
      const response = await this.queryDatasets(cpf, 'basic_data');
      const data = response?.Result?.[0]?.Data;

      if (!data) {
        return { valid: false };
      }

      const basicInfo = data as Record<string, unknown>;
      const situation = (basicInfo.SituacaoCadastral as string) || '';
      return {
        valid: situation.toUpperCase().includes('REGULAR'),
        name: (basicInfo.Nome as string) || undefined,
        birthDate: (basicInfo.DataNascimento as string) || undefined,
        situation,
      };
    } catch (error) {
      logger.error({ error, cpf: `***${cpf.slice(-4)}` }, 'CPF validation failed');
      return { valid: false };
    }
  }

  /**
   * Query BigDataCorp API with one or more comma-separated datasets
   */
  private async queryDatasets(cpf: string, datasets: string): Promise<BigDataResponse> {
    const url = `${this.baseUrl}/pessoas`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': this.token,
      },
      body: JSON.stringify({
        Datasets: datasets,
        q: `doc{${cpf}}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BigDataCorp API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<BigDataResponse>;
  }

  /**
   * Extract Quod credit score from results
   * Quod returns score 300-1000 (300=high risk, 1000=low risk)
   */
  private extractQuodScore(results: BigDataResponse['Result']): number {
    for (const result of results) {
      const data = result.Data as Record<string, unknown>;

      // Quod credit score dataset returns a Score field
      if (typeof data.Score === 'number') {
        return data.Score;
      }

      // May be nested under a score object
      if (data.ScoreCredito && typeof data.ScoreCredito === 'number') {
        return data.ScoreCredito;
      }

      // Check for score inside nested objects
      for (const key of ['QuodScore', 'CreditScore', 'score']) {
        const val = data[key];
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null) {
          const nested = val as Record<string, unknown>;
          if (typeof nested.Score === 'number') return nested.Score;
          if (typeof nested.Value === 'number') return nested.Value;
        }
      }
    }

    return 500; // Default mid-range if no score found
  }

  /**
   * Extract negative/delinquency data from Quod credit risk details
   */
  private extractNegativeData(results: BigDataResponse['Result']): {
    existingDebts: number;
    hasNegativo: boolean;
  } {
    let existingDebts = 0;
    let hasNegativo = false;

    for (const result of results) {
      const data = result.Data as Record<string, unknown>;

      // Check for negativado flag
      if (data.FlagNegativo === true || data.HasNegativo === true || data.Negativado === true) {
        hasNegativo = true;
      }

      // Sum debt values from various possible fields
      for (const field of ['TotalDividas', 'ValorTotalDividas', 'TotalPendencias', 'ValorPendenciasFinanceiras']) {
        if (typeof data[field] === 'number') {
          existingDebts += data[field] as number;
        }
      }

      // Check protest records
      if (Array.isArray(data.Protestos)) {
        hasNegativo = true;
        for (const protesto of data.Protestos) {
          const p = protesto as Record<string, unknown>;
          if (typeof p.Valor === 'number') {
            existingDebts += p.Valor;
          }
        }
      }
    }

    return {
      existingDebts: Math.round(existingDebts * 100) / 100,
      hasNegativo,
    };
  }

  /**
   * Determine fraud risk from basic_data (cadastral status) + kyc (PEP, sanctions)
   */
  private determineFraudRisk(
    results: BigDataResponse['Result'],
    score: number,
  ): { fraudRisk: FraudRisk; isPep: boolean } {
    let isPep = false;
    let hasIrregularCpf = false;
    let hasFraudAlert = false;

    for (const result of results) {
      const data = result.Data as Record<string, unknown>;

      // Check CPF cadastral status from basic_data
      const situation = data.SituacaoCadastral as string;
      if (situation && !situation.toUpperCase().includes('REGULAR')) {
        hasIrregularCpf = true;
      }

      // Check PEP status from kyc dataset
      if (data.PEP === true || data.IsPep === true || data.PessoaPoliticamenteExposta === true) {
        isPep = true;
      }

      // Check sanctions
      if (data.Sanctions === true || data.SancoesInternacionais === true) {
        hasFraudAlert = true;
      }

      // Check fraud alerts
      if (data.AlertaFraude === true || data.FraudAlert === true) {
        hasFraudAlert = true;
      }
    }

    let fraudRisk: FraudRisk;
    if (hasIrregularCpf || hasFraudAlert) {
      fraudRisk = 'HIGH';
    } else if (score < 350) {
      fraudRisk = 'HIGH';
    } else if (score < 550 || isPep) {
      fraudRisk = 'MEDIUM';
    } else {
      fraudRisk = 'LOW';
    }

    return { fraudRisk, isPep };
  }
}
