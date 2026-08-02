import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const disconnectDb = async (): Promise<void> => {
    if (mongoose.connection.readyState === 0) return;
    await mongoose.connection.close();
    logger.info('mongodb connection closed');
}