import * as mongoose from "mongoose";
import {env} from "@config/env.js";



let closingPromise: Promise<void> | null = null
let connectionPromise : Promise<void> | null = null
let hasEstablishedClient = false

const isDbConnected = (): boolean =>
    mongoose.connection.readyState === mongoose.ConnectionStates.connected

const openConnection = async (): Promise<void> => {
    try {
        await mongoose.connect(env.MONGODB_URI);
    } catch {
        throw new Error('failed to establish mongodb connection');
    }
}

export const connectDb = async (): Promise<void> =>{
    if(closingPromise){
        throw new Error('mongodb connection is closing')
    }
    if(connectionPromise) return connectionPromise
    if(isDbConnected()) return
    if (hasEstablishedClient){
        throw new Error('mongodb Connection is temporarily unavailable')
    }
}