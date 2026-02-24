import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { KYCVerificationResult } from './caf-provider';

interface DiditSessionResponse {
  session_id: string;
  session_number: number;
  vendor_data: string;
  status: string;
  workflow_id: string;
  callback: string;
  url: string;
}

interface DiditDecisionResponse {
  session_id: string;
  status: 'Approved' | 'Declined' | 'In Review' | 'Not Started' | 'In Progress' | 'Expired' | 'Abandoned';
  vendor_data: string;
  features: {
    ocr?: {
      status: string;
      data?: {
        name?: string;
        document_number?: string;
        date_of_birth?: string;
        document_type?: string;
        cpf?: string;
        rg?: string;
        mother_name?: string;
      };
    };
    face?: {
      status: string;
      similarity_score?: number;
      is_match?: boolean;
    };
    liveness?: {
      status: string;
      probability?: number;
      is_alive?: boolean;
    };
  };
}

/**
 * Didit KYC Provider - Free KYC for MVPs
 *
 * Docs: https://docs.didit.me
 * Console: https://business.didit.me
 *
 * Auth: API Key via x-api-key header
 * Verification API: https://verification.didit.me
 *
 * Pricing: 500 FREE Core KYC checks/month
 * (ID verification + passive liveness + face match + IP analysis)
 * No contracts, no minimums, no setup fees.
 *
 * To get started:
 * 1. Create account at business.didit.me
 * 2. Get your API key from the dashboard
 * 3. Create a workflow (OCR + Face + Liveness)
 * 4. Set DIDIT_API_KEY=<your-api-key>
 * 5. Set DIDIT_WORKFLOW_ID=<your-workflow-id>
 * 6. Set CAF_ENABLED=false (uses Didit by default when both are off)
 */
export class DiditProvider {
  private baseUrl = 'https://verification.didit.me';
  private apiKey: string;
  private workflowId: string;
  private webhookUrl: string;

  constructor() {
    this.apiKey = env.DIDIT_API_KEY;
    this.workflowId = env.DIDIT_WORKFLOW_ID;
    this.webhookUrl = env.DIDIT_WEBHOOK_URL;
  }

  /**
   * Create a verification session for the user
   * Returns a URL the user can open to complete verification
   */
  async createSession(params: {
    cpf: string;
    leadId: string;
  }): Promise<{
    sessionId: string;
    verificationUrl: string;
  }> {
    const response = await this.request('POST', '/v3/session/', {
      workflow_id: this.workflowId,
      vendor_data: params.leadId,
      callback: this.webhookUrl,
    });

    const data = response as DiditSessionResponse;

    logger.info(
      { sessionId: data.session_id, cpf: `***${params.cpf.slice(-4)}` },
      'Didit KYC session created',
    );

    return {
      sessionId: data.session_id,
      verificationUrl: data.url,
    };
  }

  /**
   * Get the decision/result of a verification session
   */
  async getSessionDecision(sessionId: string): Promise<KYCVerificationResult> {
    const response = await this.request('GET', `/v1/session/${sessionId}/decision/`);
    const data = response as DiditDecisionResponse;

    const face = data.features?.face;
    const liveness = data.features?.liveness;
    const ocr = data.features?.ocr;

    const facematchScore = face?.similarity_score || 0;
    const facematchPassed = face?.is_match || false;
    const livenessDetected = liveness?.is_alive || false;

    const result: KYCVerificationResult = {
      verified: data.status === 'Approved',
      facematchScore,
      facematchPassed,
      livenessDetected,
      ocrData: {
        name: ocr?.data?.name,
        cpf: ocr?.data?.cpf || ocr?.data?.document_number,
        birthDate: ocr?.data?.date_of_birth,
        rg: ocr?.data?.rg,
        motherName: ocr?.data?.mother_name,
      },
      fraudIndicators: data.status === 'Declined' ? ['verification_declined'] : [],
      verificationId: sessionId,
      rawResponse: data as unknown as Record<string, unknown>,
    };

    logger.info(
      {
        sessionId,
        verified: result.verified,
        facematchScore,
        livenessDetected,
        status: data.status,
      },
      'Didit KYC decision retrieved',
    );

    return result;
  }

  /**
   * Quick 1:1 face match (selfie vs document photo)
   * Does not require a full session
   */
  async facematch(params: {
    selfieUrl: string;
    documentPhotoUrl: string;
  }): Promise<{ score: number; passed: boolean }> {
    const response = await this.request('POST', '/v3/face-match/', {
      selfie: params.selfieUrl,
      document_photo: params.documentPhotoUrl,
    });

    const data = response as { similarity_score: number; is_match: boolean };
    return {
      score: data.similarity_score || 0,
      passed: data.is_match || false,
    };
  }

  /**
   * Process Didit webhook payload
   */
  static parseWebhook(payload: unknown): {
    sessionId: string;
    status: string;
    vendorData: string;
  } | null {
    try {
      const data = payload as {
        session_id?: string;
        status?: string;
        vendor_data?: string;
      };
      if (!data?.session_id || !data?.status) return null;
      return {
        sessionId: data.session_id,
        status: data.status,
        vendorData: data.vendor_data || '',
      };
    } catch {
      return null;
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, path, error: errorText }, 'Didit API error');
      throw new Error(`Didit API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }
}
