import { logger } from '../../config/logger';
import { env } from '../../config/env';
import crypto from 'crypto';

interface QITechDebtResponse {
  data: {
    debt_key: string;
    credit_operation_status: string;
    contract?: {
      contract_number: string;
      contract_url: string;
      signature_url: string;
    };
    installments?: Array<{
      due_date: string;
      total_amount: number;
      principal_amount: number;
      interest_amount: number;
    }>;
    annual_cet?: number;
    disbursed_issue_amount?: number;
  };
}

export interface DisbursementRequest {
  borrowerName: string;
  borrowerCpf: string;
  borrowerPhone: string;
  borrowerEmail: string;
  borrowerBirthDate: string;
  borrowerMotherName?: string;
  borrowerNationality?: string;
  borrowerAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
  };
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
 * Docs: https://docs.qitech.com.br
 *
 * Auth: ECDSA ES512 (P-521 curve) signed JWTs
 *   - All request bodies are JWT-encoded: {"encoded_body": "<JWT>"}
 *   - Authorization header: "QIT {client_key}:{auth_jwt}"
 *   - Both requests AND responses are signed
 *
 * Key generation:
 *   ssh-keygen -t ecdsa -b 521 -m PEM -f qitech.key
 *   openssl ec -in qitech.key -pubout -outform PEM -out qitech.key.pub
 *
 * Base URL: https://api-auth.qitech.app (production)
 * Sandbox: https://api-auth.sandbox.qitech.app
 *
 * Flow: Upload docs → Create debt (CCB) → QI Tech signs → PIX disbursement
 *
 * To get started:
 * 1. Contact QI Tech (qitech.com.br) for API access
 * 2. Generate ECDSA P-521 key pair, upload public key to QI Tech dashboard
 * 3. They provide: API-CLIENT-KEY (UUID) + QI Tech's public key
 * 4. Set QITECH_CLIENT_KEY=<your-uuid>
 * 5. Set QITECH_PRIVATE_KEY=<base64-encoded-PEM-private-key>
 * 6. Set QITECH_ENABLED=true
 * 7. For production: QITECH_API_URL=https://api-auth.qitech.app
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
   * 3. After contract signature, triggers PIX disbursement to borrower
   * 4. Sends webhook notifications on status changes
   *
   * Status lifecycle: waiting_signature → signature_received → disbursing → disbursed
   */
  async createDebtAndDisburse(params: DisbursementRequest): Promise<DisbursementResult> {
    try {
      const debtPayload = this.buildDebtPayload(params);

      const response = await this.signedRequest('POST', '/debt', debtPayload);
      const data = response as QITechDebtResponse;

      logger.info(
        {
          operationKey: data.data?.debt_key,
          status: data.data?.credit_operation_status,
          borrowerCpf: `***${params.borrowerCpf.slice(-4)}`,
          amount: params.amount,
        },
        'QI Tech debt operation created',
      );

      return {
        success: true,
        operationKey: data.data?.debt_key,
        status: data.data?.credit_operation_status,
        message: 'Operação de crédito criada. Aguardando assinatura para desembolso.',
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
   * Simulate a debt operation (preview payment plan without creating)
   */
  async simulateDebt(params: DisbursementRequest): Promise<{
    success: boolean;
    installments?: Array<{ dueDate: string; amount: number }>;
    annualCet?: number;
    message: string;
  }> {
    try {
      const payload = this.buildDebtPayload(params);
      const response = await this.signedRequest('POST', '/debt_simulation', payload);
      const data = response as QITechDebtResponse;

      return {
        success: true,
        installments: data.data?.installments?.map((i) => ({
          dueDate: i.due_date,
          amount: i.total_amount,
        })),
        annualCet: data.data?.annual_cet,
        message: 'Simulação realizada.',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Erro na simulação: ${errorMsg}` };
    }
  }

  /**
   * Submit a signed contract PDF (when partner manages signature externally)
   */
  async submitSignedContract(debtKey: string, signedPdfUrl: string): Promise<void> {
    await this.signedRequest('POST', `/debt/${debtKey}/signed`, {
      type: 'pdf-signature',
      'path-pdf-signed': signedPdfUrl,
    });
    logger.info({ debtKey }, 'Signed contract submitted to QI Tech');
  }

  /**
   * Get the status of a debt operation
   */
  async getDebtStatus(operationKey: string): Promise<{
    status: string;
    contractUrl?: string;
    rawResponse: Record<string, unknown>;
  }> {
    const response = await this.signedRequest('GET', `/debt/${operationKey}`);
    const data = response as QITechDebtResponse;

    return {
      status: data.data?.credit_operation_status,
      contractUrl: data.data?.contract?.contract_url,
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
   * Cancel a debt operation before disbursement
   */
  async cancelDebt(debtKey: string): Promise<void> {
    await this.signedRequest('POST', `/debt/${debtKey}/cancel`, {});
    logger.info({ debtKey }, 'QI Tech debt cancelled');
  }

  /**
   * Health check — verify API connectivity and auth
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.signedRequest('GET', `/test/${this.clientKey}`);
      const data = response as { ping?: string };
      return data.ping === 'pong';
    } catch {
      return false;
    }
  }

  /**
   * Process QI Tech webhook
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
    const borrower: Record<string, unknown> = {
      person_type: 'natural',
      name: params.borrowerName,
      individual_document_number: params.borrowerCpf,
      phone: this.parsePhone(params.borrowerPhone),
      email: params.borrowerEmail,
      birth_date: params.borrowerBirthDate,
      mother_name: params.borrowerMotherName || 'Não informado',
      nationality: params.borrowerNationality || 'brasileiro',
      is_pep: false,
      role_type: 'issuer',
    };

    // Address is required by QI Tech
    if (params.borrowerAddress) {
      borrower.address = {
        street: params.borrowerAddress.street,
        number: params.borrowerAddress.number,
        complement: params.borrowerAddress.complement || '',
        neighborhood: params.borrowerAddress.neighborhood,
        city: params.borrowerAddress.city,
        state: params.borrowerAddress.state,
        postal_code: params.borrowerAddress.postalCode,
      };
    }

    return {
      borrower,
      financial: {
        amount: params.amount,
        interest_type: 'pre_price_days',
        credit_operation_type: 'ccb', // Cédula de Crédito Bancário
        annual_interest_rate: this.monthlyToAnnualRate(params.interestRateMonthly),
        disbursement_date: new Date().toISOString().split('T')[0],
        interest_grace_period: 0,
        principal_grace_period: 0,
        number_of_installments: params.installments,
        fine_configuration: {
          monthly_rate: 0.01, // 1% monthly late interest
          interest_base: 'calendar_days',
          contract_fine_rate: 0.02, // 2% fine
        },
      },
      disbursement_bank_accounts: [
        {
          account_type: 'pix',
          pix_key: params.disbursementPixKey,
          pix_key_type: params.disbursementPixKeyType,
          name: params.borrowerName,
          document_number: params.borrowerCpf,
          percentage_receivable: 100,
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
   * Create a signed JWT using ECDSA ES512 (P-521 curve)
   * QI Tech requires all payloads and auth tokens to be JWT-signed.
   */
  private createJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({
      alg: 'ES512',
      typ: 'JWT',
    })).toString('base64url');

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signer = crypto.createSign('SHA512');
    signer.update(`${header}.${encodedPayload}`);
    const signature = signer.sign(this.privateKey, 'base64url');

    return `${header}.${encodedPayload}.${signature}`;
  }

  /**
   * Sign request with QI Tech's dual-JWT authentication
   *
   * QI Tech auth flow:
   * 1. Encode request body as JWT (encoded_body) — only for POST/PATCH/PUT
   * 2. Create Authorization JWT with metadata (method, uri, body hash)
   * 3. Authorization header: "QIT {client_key}:{auth_jwt}"
   * 4. Body: {"encoded_body": "<body_jwt>"}
   */
  private async signedRequest(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    // Step 1: Encode body as JWT (for POST/PATCH/PUT)
    let encodedBody: string | undefined;
    if (body && method !== 'GET') {
      encodedBody = this.createJwt(body);
    }

    // Step 2: Build Authorization JWT
    const authPayload: Record<string, unknown> = {
      sub: this.clientKey,
      method: method.toUpperCase(),
      uri: path,
      iat: Math.floor(Date.now() / 1000),
    };

    // Include MD5 hash of encoded body for integrity verification
    if (encodedBody) {
      authPayload.signature_hash = crypto
        .createHash('md5')
        .update(encodedBody)
        .digest('hex');
    }

    const authJwt = this.createJwt(authPayload);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `QIT ${this.clientKey}:${authJwt}`,
        'API-CLIENT-KEY': this.clientKey,
      },
    };

    if (encodedBody) {
      options.body = JSON.stringify({ encoded_body: encodedBody });
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, path, error: errorText }, 'QI Tech API error');
      throw new Error(`QI Tech API error ${response.status}: ${errorText}`);
    }

    if (response.status === 201 || response.status === 204) {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    }

    return response.json();
  }
}
