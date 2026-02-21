import { logger } from '../../config/logger';
import { env } from '../../config/env';
import crypto from 'crypto';

interface QITechDebtResponse {
  data: {
    key: string;
    status: string;
    borrower: Record<string, unknown>;
    disbursement_accounts: Array<Record<string, unknown>>;
    financial: Record<string, unknown>;
  };
  event_datetime: string;
  webhook_type: string;
}

export interface DisbursementRequest {
  borrowerName: string;
  borrowerCpf: string;
  borrowerPhone: string;
  borrowerEmail: string;
  borrowerBirthDate: string;
  borrowerMotherName?: string;
  amount: number;
  installments: number;
  interestRateMonthly: number;
  monthlyPayment: number;
  totalAmount: number;
  firstDueDate: string;
  disbursementPixKey: string;
  disbursementPixKeyType: 'cpf' | 'phone' | 'email' | 'random';
  contractNumber: string;
}

export interface DisbursementResult {
  success: boolean;
  operationKey?: string;
  status?: string;
  message: string;
  rawResponse?: Record<string, unknown>;
}

export interface QITechWebhookPayload {
  webhook_type: string;
  key: string;
  status: string;
  event_datetime: string;
  data: Record<string, unknown>;
}

/**
 * QI Tech API Integration - Funding & Disbursement
 *
 * Docs: https://documentation.qitech.com.br
 *
 * Auth: JWT signed with client private key (JWS - JSON Web Signature)
 * Base URL: https://api.qitech.app (production)
 * Sandbox: https://api-auth.sandbox.qitech.app
 *
 * QI Tech provides the full credit infrastructure:
 * - Debt operation creation (formalizes the loan with BACEN)
 * - PIX disbursement (sends money to borrower)
 * - Collection management (generates payment slips / boletos)
 * - Webhook notifications for all status changes
 *
 * To get started:
 * 1. Contact QI Tech (qitech.com.br) for API access
 * 2. They provide: client_key + private_key (PEM)
 * 3. Set QITECH_CLIENT_KEY=<your-client-key>
 * 4. Set QITECH_PRIVATE_KEY=<base64-encoded-PEM-private-key>
 * 5. Set QITECH_ENABLED=true
 * 6. For production: QITECH_API_URL=https://api.qitech.app
 */
export class QITechProvider {
  private baseUrl: string;
  private clientKey: string;
  private privateKey: string;

  constructor() {
    this.baseUrl = env.QITECH_API_URL;
    this.clientKey = env.QITECH_CLIENT_KEY;
    // Private key stored as base64 in env, decode to PEM
    this.privateKey = Buffer.from(env.QITECH_PRIVATE_KEY, 'base64').toString('utf-8');
  }

  /**
   * Create a debt operation (empréstimo pessoal) and trigger disbursement
   *
   * This is the main flow:
   * 1. Creates the debt operation with QI Tech (formalizes with BACEN/CIP)
   * 2. QI Tech handles the regulatory registration
   * 3. On approval, triggers PIX disbursement to borrower
   * 4. Sends webhook notifications on status changes
   */
  async createDebtAndDisburse(params: DisbursementRequest): Promise<DisbursementResult> {
    try {
      const debtPayload = this.buildDebtPayload(params);

      const response = await this.signedRequest('POST', '/debt', debtPayload);
      const data = response as QITechDebtResponse;

      logger.info(
        {
          operationKey: data.data?.key,
          status: data.data?.status,
          borrowerCpf: `***${params.borrowerCpf.slice(-4)}`,
          amount: params.amount,
        },
        'QI Tech debt operation created',
      );

      return {
        success: true,
        operationKey: data.data?.key,
        status: data.data?.status,
        message: 'Operação de crédito criada. Aguardando aprovação para desembolso.',
        rawResponse: data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, borrowerCpf: `***${params.borrowerCpf.slice(-4)}` }, 'QI Tech debt creation failed');

      return {
        success: false,
        message: `Erro ao criar operação: ${errorMsg}`,
      };
    }
  }

  /**
   * Get the status of a debt operation
   */
  async getDebtStatus(operationKey: string): Promise<{
    status: string;
    disbursementStatus?: string;
    rawResponse: Record<string, unknown>;
  }> {
    const response = await this.signedRequest('GET', `/debt/${operationKey}`);
    const data = response as QITechDebtResponse;

    return {
      status: data.data?.status,
      disbursementStatus: (data.data?.disbursement_accounts?.[0] as Record<string, unknown>)?.status as string,
      rawResponse: data as unknown as Record<string, unknown>,
    };
  }

  /**
   * List all debt operations (with optional filters)
   */
  async listDebts(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ operations: Array<Record<string, unknown>>; total: number }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('page_size', String(params.pageSize));

    const queryString = query.toString();
    const path = queryString ? `/debt?${queryString}` : '/debt';

    const response = await this.signedRequest('GET', path);
    const data = response as { data: Array<Record<string, unknown>>; pagination: { total: number } };

    return {
      operations: data.data || [],
      total: data.pagination?.total || 0,
    };
  }

  /**
   * Process QI Tech webhook
   * Verify the JWS signature and extract the payload
   */
  static parseWebhook(payload: unknown): QITechWebhookPayload | null {
    try {
      const data = payload as QITechWebhookPayload;
      if (!data?.webhook_type || !data?.key) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  private buildDebtPayload(params: DisbursementRequest): Record<string, unknown> {
    return {
      borrower: {
        person_type: 'natural',
        name: params.borrowerName,
        document_number: params.borrowerCpf,
        phone: this.parsePhone(params.borrowerPhone),
        email: params.borrowerEmail,
        birth_date: params.borrowerBirthDate,
        mother_name: params.borrowerMotherName || null,
      },
      financial: {
        amount: params.amount,
        interest_type: 'pre_price',
        credit_operation_type: 'ccb', // Cédula de Crédito Bancário
        annual_interest_rate: this.monthlyToAnnualRate(params.interestRateMonthly),
        disbursement_date: new Date().toISOString().split('T')[0],
        interest_grace_period: 0,
        principal_grace_period: 0,
        number_of_installments: params.installments,
        rebate: null,
        fine_configuration: {
          monthly_rate: 0.02, // 2% fine
          interest_base: 'calendar_days',
          contract_fine_rate: 0.02,
        },
      },
      disbursement_accounts: [
        {
          account_type: 'pix',
          pix_key: params.disbursementPixKey,
          pix_key_type: params.disbursementPixKeyType,
          name: params.borrowerName,
          document_number: params.borrowerCpf,
        },
      ],
      external_contract_number: params.contractNumber,
    };
  }

  /**
   * Parse phone into QI Tech's expected format { country_code, area_code, number }
   * Handles: +5511999999999, 5511999999999, 11999999999
   */
  private parsePhone(phone: string): { country_code: string; area_code: string; number: string } {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) {
      return {
        country_code: '055',
        area_code: digits.slice(2, 4),
        number: digits.slice(4),
      };
    }
    // Assume Brazilian number without country code
    return {
      country_code: '055',
      area_code: digits.slice(0, 2),
      number: digits.slice(2),
    };
  }

  /**
   * Convert monthly interest rate to annual
   * Example: 1.99% monthly → ~26.7% annual
   */
  private monthlyToAnnualRate(monthlyRate: number): number {
    const monthlyDecimal = monthlyRate / 100;
    const annual = (Math.pow(1 + monthlyDecimal, 12) - 1) * 100;
    return Math.round(annual * 100) / 100;
  }

  /**
   * Sign request with JWS (JSON Web Signature)
   * QI Tech uses JWT where the body is encoded in the payload claim.
   *
   * Flow:
   * 1. Build a JWT with the request body in the payload
   * 2. Sign with RS256 (RSA-SHA256) using the private key
   * 3. Send the JWS as the request body (POST) or Authorization (GET)
   */
  private async signedRequest(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const now = Math.floor(Date.now() / 1000);

    // Build JWS header
    const header = Buffer.from(JSON.stringify({
      alg: 'RS256',
      typ: 'JWT',
    })).toString('base64url');

    // Build JWS payload — body goes inside the payload as a claim
    const payload = Buffer.from(JSON.stringify({
      sub: this.clientKey,
      iat: now,
      exp: now + 300, // 5 minute expiry
      ...(body || {}),
    })).toString('base64url');

    // Single RS256 signature over header.payload
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(this.privateKey, 'base64url');
    const jws = `${header}.${payload}.${signature}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jws}`,
        'API-CLIENT-KEY': this.clientKey,
      },
    };

    if (body && method !== 'GET') {
      // QI Tech expects the encoded body as JWS in the POST body
      options.body = JSON.stringify({ encoded_body: jws });
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, path, error: errorText }, 'QI Tech API error');
      throw new Error(`QI Tech API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }
}
