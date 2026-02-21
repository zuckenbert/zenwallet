import { env } from '../../config/env';
import { logger } from '../../config/logger';

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

  private async request(endpoint: string, body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}/${endpoint}/${this.instance}`;
    
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
        throw new Error(`Evolution API error ${response.status}: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      logger.error({ error, endpoint }, 'WhatsApp API request failed');
      throw error;
    }
  }

  async sendText({ to, text }: SendMessageOptions): Promise<unknown> {
    const phone = this.normalizePhone(to);
    logger.info({ to: phone }, 'Sending WhatsApp text message');
    
    return this.request('message/sendText', {
      number: phone,
      text,
    });
  }

  async sendMedia({ to, mediaUrl, caption, mediaType }: SendMediaOptions): Promise<unknown> {
    const phone = this.normalizePhone(to);
    logger.info({ to: phone, mediaType }, 'Sending WhatsApp media');

    return this.request('message/sendMedia', {
      number: phone,
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption || '',
    });
  }

  async sendButtons({ to, text, buttons, footer }: SendButtonsOptions): Promise<unknown> {
    const phone = this.normalizePhone(to);
    
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
    const phone = this.normalizePhone(to);

    return this.request('message/sendList', {
      number: phone,
      title,
      description,
      buttonText,
      sections,
    });
  }

  async sendLocation(to: string, lat: number, lng: number, name?: string): Promise<unknown> {
    const phone = this.normalizePhone(to);
    
    return this.request('message/sendLocation', {
      number: phone,
      latitude: lat,
      longitude: lng,
      name: name || '',
    });
  }

  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  }
}

export const whatsappClient = new WhatsAppClient();
