import {logger} from "./src/utils/logger.js";
import type {Server} from 'node:http';
import { disconnectDb } from './src/config/db.js';
const shutdown_timeout = 10_000
let isShuttingDown = false
let server: Server | null = null

const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({signal},'shutting down gracefully')
    const forceTimer = setTimeout(() => {
        logger.error({timeOut: shutdown_timeout}, 'graceful shutdown timed out')
        process.exit(1)
    },shutdown_timeout)
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

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.once('unhandledRejection', (reason: unknown) => {
    logger.error({err: reason}, 'unhandled rejection shutdown')
    shutdown('unhandledRejection')
})

process.once('uncaughtException', (err: Error) => {
    logger.fatal({err}, 'uncaught exception shutdown')
    shutdown('uncaughtException')
})


