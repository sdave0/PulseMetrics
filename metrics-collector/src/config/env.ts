import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  PG_USER: z.string().default('user'),
  PG_HOST: z.string().default('localhost'),
  PG_DATABASE: z.string().default('metrics_db'),
  PG_PASSWORD: z.string().default('password'),
  PG_PORT: z.string().default('5432').transform(Number),
  GOOGLE_API_KEY: z.string().optional(),
});

export const config = envSchema.parse(process.env);
