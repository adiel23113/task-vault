import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal','warn','info','error','debug','trace']).optional(),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z.string().trim().min(1, {message: 'mongodb uri is required'}).startsWith('mongodb', {message: 'mongodb uri must start with mongodb'})
})

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error(JSON.stringify(z.treeifyError(parsed.error), null, 2));
    process.exit(1);
}
const data = parsed.data;
type parsedEnv = z.infer<typeof envSchema>

export type Env = Readonly<parsedEnv & {
    readonly isDevelopment: boolean;
}>
export const env: Env = Object.freeze({
    ...data,
    isDevelopment: data.NODE_ENV === 'development'
})
