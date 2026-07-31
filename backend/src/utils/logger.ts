import {env} from '../config/env.js'
import pino from 'pino';

const defaultLevel = env.NODE_ENV === "development" ?  'debug' : 'info';
 export const logger = pino({
    name: 'task-vault-api',
    level: env.LOG_LEVEL ?? defaultLevel
})