import {logger} from "./src/utils/logger.js";

let isShuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({signal},'shutting down gracefully')
}