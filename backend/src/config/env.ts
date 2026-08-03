import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal','warn','info','error','debug','trace']).optional(),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z.string().trim().min(1, {message: 'mongodb uri is required'}).startsWith('mongodb', {message: 'mongodb uri must start with mongodb'})
})

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables', z.treeifyError(parsed.error));
    process.exit(1);
}
export type Env = z.infer<typeof envSchema>;
export const env: Env = Object.freeze(parsed.data);