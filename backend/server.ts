
import {logger} from "./src/utils/logger.js";
import {createServer} from 'node:http';
import {connectDb, disconnectDb} from './src/config/db.js';
import {env} from "./src/config/env.js";
import { app } from './src/app.js';
import {promise} from "zod/v3";

const listen_errors: Readonly<Record<string, string>> = {
    EADDRINUSE: 'is already in use',
    ACCESS: 'requires elevated privileges'
}

const shutdown_timeout = 10_000
const keepAlive_timeout = 65_000
const request_timeout = 30_000
const headers_timeout = keepAlive_timeout + 5_000
let isShuttingDown = false
let server: ReturnType<typeof createServer>| null = null;

const shutdown = async (reason: string, exitCode =0): Promise<void> =>{
    if(isShuttingDown) return
    isShuttingDown = true
    logger.info({reason,exitCode},'shutting down gracefully')
    const forceTimer = setTimeout(()=> {
    logger.error({timeOut:shutdown_timeout},'graceful shutdown time out,forcing exit')
        server?.closeAllConnections()
    },)
}

const attachProcessHandlers = (): void => {
    const onFatal = (reason: string, level: 'fatal' | 'error') =>
        (err: unknown): void => {
            logger[level]({err}, `${reason} - initiating shutdown`)
        }
    process.on('uncaughtException', onFatal('uncaughtException', 'fatal'))
    process.on('unhandledRejection', onFatal('unhandledRejection', 'error'))

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGQUIT']
    for (const signal of signals) {
        process.on(signal, () => {
            logger.info({signal}, 'received termination signal')
        })
        }
}

const startServer = async(): Promise<void> => {
    await connectDb()
   const httpServer = createServer(app)
     server = httpServer

    httpServer.keepAliveTimeout = keepAlive_timeout;
    httpServer.headersTimeout = headers_timeout
    httpServer.requestTimeout = request_timeout

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
        const listenError = listen_errors[err.code ?? '']

        logger.fatal({err, ...(listenError && {port: env.PORT})}, listenError ? `port ${env.PORT}
         ${listenError}` : 'server encountered a fatal error')

    })
    await new Promise<void>(resolve => {
        httpServer.listen(env.PORT, resolve)
    })
}

try {
    await startServer();
} catch (err) {
    logger.fatal({ err }, 'failed to start server');
    process.exit(1);
}
