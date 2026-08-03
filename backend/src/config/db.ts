import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

export const connectDb = async (): Promise<void> => {
    if (mongoose.connection.readyState === 1) return;

    await mongoose.connect(env.MONGODB_URI);
    logger.info('mongodb connected');
};

export const disconnectDb = async (): Promise<void> => {
    if (mongoose.connection.readyState === 0) return;
    await mongoose.connection.close();
    logger.info('mongodb connection closed');
};