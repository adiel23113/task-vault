
import {logger} from "./src/utils/logger.js";
import type {Server} from 'node:http';
import {connectDb, disconnectDb} from './src/config/db.js';
import {env} from "./src/config/env.js";
import { app } from './src/app.js';


const shutdown_timeout = 10_000
const PORT = Number(process.env.PORT) || 3000;
let isShuttingDown = false
let server: Server | null = null

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
    server = app.listen(env.PORT, () => {
        logger.info({
            port: env.PORT,
            env: env.NODE_ENV,
            pid:process.pid,
            node:process.version,
        },'server started')
        logger.info({url:`http://localhost:${env.PORT}/api/v1`})
    })
}

try {
    await startServer();
} catch (err) {
    logger.fatal({ err }, 'failed to start server');
    process.exit(1);
}
