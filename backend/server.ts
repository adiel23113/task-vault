
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

const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({signal}, 'shutting down gracefully')
    const forceTimer = setTimeout(() => {
        logger.error({timeOut: shutdown_timeout}, 'graceful shutdown timed out')
        process.exit(1)
    }, shutdown_timeout)
    forceTimer.unref()
    try {
        if (server) {
            server.closeAllConnections()
            await new Promise<void>((resolve, reject) => {
                server!.close(err => (err ? reject(err) : resolve()))
            })
            logger.info('http server closed')
        }
        await disconnectDb()
        process.exit(0)

    } catch (err) {
        logger.error({err}, 'error during shutdown cleanup')
        process.exit(1)
    }
}

process.once('unhandledRejection', (reason: unknown) => {
    logger.error({err: reason}, 'unhandled rejection shutdown')
    void shutdown('unhandledRejection')
})

process.once('uncaughtException', (err: Error) => {
    logger.fatal({err}, 'uncaught exception shutdown')
    void shutdown('uncaughtException')
})

const startServer = async(): Promise<void> => {
    await connectDb()
   const httpServer = createServer(app)

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
