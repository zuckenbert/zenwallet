import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { normalizePhone } from '../../utils/validation';

interface SendMessageOptions {
  to: string;
  text: string;
}

interface SendMediaOptions {
  to: string;
  mediaUrl: string;
  caption?: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
}

interface SendButtonsOptions {
  to: string;
  text: string;
  buttons: Array<{ id: string; text: string }>;
  footer?: string;
}

interface SendListOptions {
  to: string;
  title: string;
  description: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export class WhatsAppClient {
  private baseUrl: string;
  private apiKey: string;
  private instance: string;

  constructor() {
    this.baseUrl = env.EVOLUTION_API_URL;
    this.apiKey = env.EVOLUTION_API_KEY;
    this.instance = env.EVOLUTION_INSTANCE_NAME;
  }

  private async request(endpoint: string, body: unknown, retries = 3): Promise<unknown> {
    const url = `${this.baseUrl}/${endpoint}/${this.instance}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const status = response.status;
          // Don't retry client errors (4xx) except 429
          if (status >= 400 && status < 500 && status !== 429) {
            throw new Error(`Evolution API error ${status}: ${errorText}`);
          }
          throw new Error(`Evolution API error ${status}: ${errorText}`);
        }

        return response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const isClientError = lastError.message.includes('Evolution API error 4') &&
          !lastError.message.includes('Evolution API error 429');

        if (isClientError || attempt >= retries) {
          logger.error({ error: lastError, endpoint, attempt }, 'WhatsApp API request failed');
          throw lastError;
        }

        const backoffMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        logger.warn({ endpoint, attempt, backoffMs }, 'WhatsApp API request failed, retrying');
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  async sendText({ to, text }: SendMessageOptions): Promise<unknown> {
    const phone = normalizePhone(to);
    logger.info({ to: phone }, 'Sending WhatsApp text message');
    
    return this.request('message/sendText', {
      number: phone,
      text,
    });
  }

  async sendMedia({ to, mediaUrl, caption, mediaType }: SendMediaOptions): Promise<unknown> {
    const phone = normalizePhone(to);
    logger.info({ to: phone, mediaType }, 'Sending WhatsApp media');

    return this.request('message/sendMedia', {
      number: phone,
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption || '',
    });
  }

  async sendButtons({ to, text, buttons, footer }: SendButtonsOptions): Promise<unknown> {
    const phone = normalizePhone(to);
    
    return this.request('message/sendButtons', {
      number: phone,
      title: '',
      description: text,
      footer: footer || '',
      buttons: buttons.map((b) => ({
        type: 'reply',
        reply: { id: b.id, title: b.text },
      })),
    });
  }

  async sendList({ to, title, description, buttonText, sections }: SendListOptions): Promise<unknown> {
    const phone = normalizePhone(to);

    return this.request('message/sendList', {
      number: phone,
      title,
      description,
      buttonText,
      sections,
    });
  }

  async sendLocation(to: string, lat: number, lng: number, name?: string): Promise<unknown> {
    const phone = normalizePhone(to);
    
    return this.request('message/sendLocation', {
      number: phone,
      latitude: lat,
      longitude: lng,
      name: name || '',
    });
  }

}

export const whatsappClient = new WhatsAppClient();
