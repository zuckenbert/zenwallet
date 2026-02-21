import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_KEY: z.string().default('dev-api-key'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  ANTHROPIC_API_KEY: z.string(),

  // WhatsApp - Evolution API
  EVOLUTION_API_URL: z.string().default('http://localhost:8080'),
  EVOLUTION_API_KEY: z.string().default(''),
  EVOLUTION_INSTANCE_NAME: z.string().default('zenwallet'),

  // Credit Bureau - Serasa (legacy)
  SERASA_API_URL: z.string().default('https://api.serasa.com.br'),
  SERASA_API_KEY: z.string().default('mock'),
  SERASA_ENABLED: z.coerce.boolean().default(false),

  // Credit Bureau - BigDataCorp
  BIGDATA_API_URL: z.string().default('https://plataforma.bigdatacorp.com.br'),
  BIGDATA_API_KEY: z.string().default('mock'),
  BIGDATA_ENABLED: z.coerce.boolean().default(false),

  // KYC - CAF (Combate à Fraude)
  CAF_API_URL: z.string().default('https://api.sandbox.caf.io/v1'),
  CAF_API_KEY: z.string().default('mock'),
  CAF_ENABLED: z.coerce.boolean().default(false),

  // Digital Signature - Clicksign
  CLICKSIGN_API_URL: z.string().default('https://sandbox.clicksign.com/api/v1'),
  CLICKSIGN_API_KEY: z.string().default('mock'),
  CLICKSIGN_ENABLED: z.coerce.boolean().default(false),

  // Funding - QI Tech
  QITECH_API_URL: z.string().default('https://api-auth.sandbox.qitech.app'),
  QITECH_CLIENT_KEY: z.string().default('mock'),
  QITECH_PRIVATE_KEY: z.string().default('mock'),
  QITECH_ENABLED: z.coerce.boolean().default(false),

  // Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),

  // Loan configuration
  MIN_LOAN_AMOUNT: z.coerce.number().default(1000),
  MAX_LOAN_AMOUNT: z.coerce.number().default(100000),
  MIN_INSTALLMENTS: z.coerce.number().default(3),
  MAX_INSTALLMENTS: z.coerce.number().default(48),
  BASE_INTEREST_RATE: z.coerce.number().default(1.99),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
