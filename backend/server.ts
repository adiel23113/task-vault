import {logger} from "./src/utils/logger.js";
import type {Server} from 'node:http'
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
        }
    } catch (err) {
        console.error()
        }
    }




