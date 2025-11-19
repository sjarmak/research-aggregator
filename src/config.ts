import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  ADS_API_TOKEN: z.string().optional(),
  SOURCEGRAPH_TOKEN: z.string().optional(),
  SOURCEGRAPH_URL: z.string().default('https://sourcegraph.com'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

const parseConfig = (): Config => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues.map((issue) => issue.path.join('.')).join(', ');
      console.error(`Invalid configuration. Missing or invalid fields: ${missing}`);
      process.exit(1);
    }
    throw error;
  }
};

export const config = parseConfig();
