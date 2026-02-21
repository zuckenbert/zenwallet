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

  EVOLUTION_API_URL: z.string().default('http://localhost:8080'),
  EVOLUTION_API_KEY: z.string().default(''),
  EVOLUTION_INSTANCE_NAME: z.string().default('zenwallet'),

  SERASA_API_URL: z.string().default('https://api.serasa.com.br'),
  SERASA_API_KEY: z.string().default('mock'),
  SERASA_ENABLED: z.coerce.boolean().default(false),

  BIGDATA_API_URL: z.string().default('https://api.bigdatacorp.com.br'),
  BIGDATA_API_KEY: z.string().default('mock'),
  BIGDATA_ENABLED: z.coerce.boolean().default(false),

  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),

  MIN_LOAN_AMOUNT: z.coerce.number().default(1000),
  MAX_LOAN_AMOUNT: z.coerce.number().default(100000),
  MIN_INSTALLMENTS: z.coerce.number().default(3),
  MAX_INSTALLMENTS: z.coerce.number().default(48),
  BASE_INTEREST_RATE: z.coerce.number().default(1.99),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
