import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables', z.treeifyError(parsed.error));
    process.exit(1);
}
export type Env = z.infer<typeof envSchema>;
export const env: Env = Object.freeze(parsed.data);