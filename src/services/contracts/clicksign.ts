import { logger } from '../../config/logger';
import { env } from '../../config/env';

interface ClicksignDocument {
  key: string;
  path: string;
  status: string;
  auto_close: boolean;
  deadline_at: string | null;
}

interface ClicksignSigner {
  key: string;
  email: string;
  phone_number: string;
  name: string;
  documentation: string;
  has_documentation: boolean;
}

interface ClicksignSignatureList {
  key: string;
  request_signature_key: string;
  document_key: string;
  signer_key: string;
  sign_as: string;
  status: string;
}

export interface ClicksignContractResult {
  documentKey: string;
  signerKey: string;
  signatureRequestKey: string;
  signingUrl: string;
}

export interface ClicksignWebhookPayload {
  event: {
    name: string; // 'upload' | 'add_signer' | 'sign' | 'cancel' | 'auto_close' | 'deadline'
  };
  document: {
    key: string;
    path: string;
    status: string;
  };
  account: {
    key: string;
  };
}

/**
 * Clicksign API Integration for Digital Signatures
 *
 * Docs: https://developers.clicksign.com
 *
 * Auth: access_token query parameter
 * Sandbox: https://sandbox.clicksign.com/api/v1
 * Production: https://app.clicksign.com/api/v1
 *
 * To get started:
 * 1. Create account at clicksign.com
 * 2. Get your access_token from Settings > API
 * 3. Set CLICKSIGN_API_KEY=<your-access-token>
 * 4. Set CLICKSIGN_ENABLED=true
 * 5. For production, set CLICKSIGN_API_URL=https://app.clicksign.com/api/v1
 */
export class ClicksignClient {
  private baseUrl: string;
  private accessToken: string;

  constructor() {
    this.baseUrl = env.CLICKSIGN_API_URL;
    this.accessToken = env.CLICKSIGN_API_KEY;
  }

  /**
   * Full flow: create document from template, add signer, send via WhatsApp
   */
  async createAndSendContract(params: {
    contractContent: string;
    fileName: string;
    signerName: string;
    signerEmail: string;
    signerCpf: string;
    signerPhone: string;
    deadlineDays?: number;
  }): Promise<ClicksignContractResult> {
    // 1. Create document from content (upload as .html or .pdf)
    const document = await this.createDocument(
      params.fileName,
      params.contractContent,
      params.deadlineDays || 7,
    );

    logger.info({ documentKey: document.key }, 'Clicksign document created');

    // 2. Add signer
    const signer = await this.addSigner({
      name: params.signerName,
      email: params.signerEmail,
      cpf: params.signerCpf,
      phone: params.signerPhone,
    });

    logger.info({ signerKey: signer.key }, 'Clicksign signer added');

    // 3. Create signature list (link signer to document)
    const signatureList = await this.createSignatureList(
      document.key,
      signer.key,
      'sign', // sign_as: sign, approve, witness, party, etc.
    );

    logger.info({ listKey: signatureList.key }, 'Clicksign signature list created');

    // 4. Send notification via WhatsApp
    await this.notifyByWhatsApp(signatureList.request_signature_key, params.signerPhone);

    logger.info({ phone: params.signerPhone }, 'Clicksign WhatsApp notification sent');

    return {
      documentKey: document.key,
      signerKey: signer.key,
      signatureRequestKey: signatureList.request_signature_key,
      signingUrl: `${this.baseUrl.replace('/api/v1', '')}/sign/${signatureList.request_signature_key}`,
    };
  }

  /**
   * Create a document from HTML content
   */
  async createDocument(
    fileName: string,
    htmlContent: string,
    deadlineDays: number,
  ): Promise<ClicksignDocument> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + deadlineDays);

    const contentBase64 = Buffer.from(htmlContent).toString('base64');

    const response = await this.request('POST', '/documents', {
      document: {
        path: `/${fileName}`,
        content_base64: `data:text/html;base64,${contentBase64}`,
        deadline_at: deadline.toISOString(),
        auto_close: true,
        locale: 'pt-BR',
        sequence_enabled: false,
        remind_interval: 3,
        block_after_refusal: true,
      },
    });

    const data = response as { document: ClicksignDocument };
    return data.document;
  }

  /**
   * Add a signer (person who will sign)
   */
  async addSigner(params: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  }): Promise<ClicksignSigner> {
    const response = await this.request('POST', '/signers', {
      signer: {
        name: params.name,
        email: params.email,
        phone_number: this.formatPhone(params.phone),
        auths: ['whatsapp'],
        delivery: 'whatsapp',
        documentation: params.cpf,
        has_documentation: true,
        selfie_enabled: false,
        handwritten_enabled: false,
        official_document_enabled: false,
        liveness_enabled: false,
        facial_biometrics_enabled: false,
      },
    });

    const data = response as { signer: ClicksignSigner };
    return data.signer;
  }

  /**
   * Create signature list (associate signer with document)
   */
  async createSignatureList(
    documentKey: string,
    signerKey: string,
    signAs: string = 'sign',
  ): Promise<ClicksignSignatureList> {
    const response = await this.request('POST', '/lists', {
      list: {
        document_key: documentKey,
        signer_key: signerKey,
        sign_as: signAs,
        refusable: true,
        message: 'Por favor, assine o contrato de empréstimo da ZenWallet.',
      },
    });

    const data = response as { list: ClicksignSignatureList };
    return data.list;
  }

  /**
   * Send signature notification via WhatsApp
   */
  async notifyByWhatsApp(
    requestSignatureKey: string,
    phone: string,
  ): Promise<void> {
    await this.request('POST', '/notifications', {
      request_signature_key: requestSignatureKey,
      message: 'Olá! Seu contrato de empréstimo da ZenWallet está pronto para assinatura. Clique no link para assinar digitalmente.',
      url: this.baseUrl.replace('/api/v1', ''),
    });
  }

  /**
   * Get document status
   */
  async getDocumentStatus(documentKey: string): Promise<{
    status: string;
    signed: boolean;
    signers: Array<{ name: string; signed: boolean; signedAt?: string }>;
  }> {
    const response = await this.request('GET', `/documents/${documentKey}`);
    const data = response as {
      document: {
        status: string;
        signers: Array<{
          name: string;
          sign_as: string;
          events: Array<{ name: string; occurred_at: string }>;
        }>;
      };
    };

    const signers = (data.document.signers || []).map((s) => {
      const signEvent = s.events?.find((e) => e.name === 'sign');
      return {
        name: s.name,
        signed: !!signEvent,
        signedAt: signEvent?.occurred_at,
      };
    });

    return {
      status: data.document.status,
      signed: data.document.status === 'closed',
      signers,
    };
  }

  /**
   * Cancel a document
   */
  async cancelDocument(documentKey: string): Promise<void> {
    await this.request('PATCH', `/documents/${documentKey}/cancel`);
  }

  /**
   * Process webhook payload from Clicksign
   */
  static parseWebhook(payload: unknown): ClicksignWebhookPayload | null {
    try {
      const data = payload as ClicksignWebhookPayload;
      if (!data?.event?.name || !data?.document?.key) {
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${separator}access_token=${this.accessToken}`;

    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, path, error: errorText }, 'Clicksign API error');
      throw new Error(`Clicksign API error ${response.status}: ${errorText}`);
    }

    if (response.status === 204) return {};
    return response.json();
  }

  private formatPhone(phone: string): string {
    // Clicksign expects +55XXXXXXXXXXX format
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55')) return `+${digits}`;
    return `+55${digits}`;
  }
}
