import { logger } from '../../config/logger';
import { env } from '../../config/env';

export interface KYCVerificationResult {
  verified: boolean;
  facematchScore: number;
  facematchPassed: boolean;
  livenessDetected: boolean;
  ocrData: {
    name?: string;
    cpf?: string;
    birthDate?: string;
    rg?: string;
    motherName?: string;
  };
  fraudIndicators: string[];
  verificationId: string;
  rawResponse: Record<string, unknown>;
}

interface CAFOnboardingResponse {
  id: string;
  status: string;
  result?: {
    facematch?: {
      score: number;
      status: string;
    };
    liveness?: {
      status: string;
      score: number;
    };
    ocr?: {
      name?: string;
      cpf?: string;
      birth_date?: string;
      rg_number?: string;
      mother_name?: string;
    };
    fraud_detection?: {
      indicators: string[];
      risk_level: string;
    };
  };
}

/**
 * CAF (Combate à Fraude) - KYC & Facematch Provider
 *
 * Docs: https://docs.caf.io
 *
 * Auth: Bearer token
 * Base URL: https://api.caf.io/v1 (production)
 * Sandbox: https://api.sandbox.caf.io/v1
 *
 * Pricing: ~R$1-3 per verification (startup-friendly, no huge minimum)
 *
 * To get started:
 * 1. Create account at caf.io
 * 2. Get your API token from the dashboard
 * 3. Set CAF_API_KEY=<your-token>
 * 4. Set CAF_ENABLED=true
 * 5. For production: set CAF_API_URL=https://api.caf.io/v1
 */
export class CAFProvider {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = env.CAF_API_URL;
    this.token = env.CAF_API_KEY;
  }

  /**
   * Create a full identity verification (document OCR + facematch + liveness)
   *
   * @param documentFrontUrl - URL of the front of the document (RG/CNH)
   * @param documentBackUrl - URL of the back of the document (optional for CNH)
   * @param selfieUrl - URL of the selfie photo
   * @param cpf - CPF for cross-validation
   */
  async verifyIdentity(params: {
    documentFrontUrl: string;
    documentBackUrl?: string;
    selfieUrl: string;
    cpf: string;
    documentType?: 'rg' | 'cnh';
  }): Promise<KYCVerificationResult> {
    // 1. Create onboarding/verification
    const verification = await this.createVerification(params);

    // 2. Poll for result (CAF processes async, typically 5-30s)
    const result = await this.pollVerification(verification.id);

    const ocrData = result.result?.ocr || {};
    const facematch = result.result?.facematch;
    const liveness = result.result?.liveness;
    const fraud = result.result?.fraud_detection;

    const facematchScore = facematch?.score || 0;
    const facematchPassed = facematchScore >= 0.7; // 70% threshold
    const livenessDetected = liveness?.status === 'live';

    const kycResult: KYCVerificationResult = {
      verified: facematchPassed && livenessDetected && result.status === 'approved',
      facematchScore,
      facematchPassed,
      livenessDetected,
      ocrData: {
        name: ocrData.name,
        cpf: ocrData.cpf,
        birthDate: ocrData.birth_date,
        rg: ocrData.rg_number,
        motherName: ocrData.mother_name,
      },
      fraudIndicators: fraud?.indicators || [],
      verificationId: verification.id,
      rawResponse: result as unknown as Record<string, unknown>,
    };

    logger.info(
      {
        cpf: `***${params.cpf.slice(-4)}`,
        verified: kycResult.verified,
        facematchScore,
        livenessDetected,
        verificationId: verification.id,
      },
      'KYC verification completed',
    );

    return kycResult;
  }

  /**
   * Verify just the document OCR (without facematch)
   */
  async extractDocumentData(params: {
    documentFrontUrl: string;
    documentBackUrl?: string;
    documentType?: 'rg' | 'cnh';
  }): Promise<{
    name?: string;
    cpf?: string;
    birthDate?: string;
    rg?: string;
  }> {
    const response = await this.request('POST', '/document-analysis', {
      document_front: params.documentFrontUrl,
      document_back: params.documentBackUrl,
      document_type: params.documentType || 'rg',
    });

    const data = response as { result?: { ocr?: Record<string, string> } };
    return {
      name: data.result?.ocr?.name,
      cpf: data.result?.ocr?.cpf,
      birthDate: data.result?.ocr?.birth_date,
      rg: data.result?.ocr?.rg_number,
    };
  }

  /**
   * Quick facematch only (selfie vs document photo)
   */
  async facematch(params: {
    selfieUrl: string;
    documentPhotoUrl: string;
  }): Promise<{ score: number; passed: boolean }> {
    const response = await this.request('POST', '/facematch', {
      selfie: params.selfieUrl,
      document_photo: params.documentPhotoUrl,
    });

    const data = response as { result?: { score: number; status: string } };
    const score = data.result?.score || 0;
    return { score, passed: score >= 0.7 };
  }

  private async createVerification(params: {
    documentFrontUrl: string;
    documentBackUrl?: string;
    selfieUrl: string;
    cpf: string;
    documentType?: 'rg' | 'cnh';
  }): Promise<CAFOnboardingResponse> {
    const body: Record<string, unknown> = {
      person: {
        cpf: params.cpf,
      },
      document: {
        type: params.documentType || 'rg',
        front: params.documentFrontUrl,
      },
      selfie: {
        image: params.selfieUrl,
      },
      checks: {
        facematch: true,
        liveness: true,
        ocr: true,
        fraud_detection: true,
      },
    };

    if (params.documentBackUrl) {
      (body.document as Record<string, unknown>).back = params.documentBackUrl;
    }

    return this.request('POST', '/identity-verifications', body) as Promise<CAFOnboardingResponse>;
  }

  private async pollVerification(
    verificationId: string,
    maxAttempts = 20,
    intervalMs = 3000,
  ): Promise<CAFOnboardingResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.request(
        'GET',
        `/identity-verifications/${verificationId}`,
      ) as CAFOnboardingResponse;

      if (result.status !== 'processing' && result.status !== 'pending') {
        return result;
      }

      logger.debug(
        { verificationId, attempt, status: result.status },
        'KYC verification still processing, polling...',
      );

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`KYC verification ${verificationId} timed out after ${maxAttempts} attempts`);
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, path, error: errorText }, 'CAF API error');
      throw new Error(`CAF API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }
}
