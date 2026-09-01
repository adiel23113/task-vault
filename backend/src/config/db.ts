import * as mongoose from "mongoose";



let closingPromise: Promise<void> | null = null
let connectionPromise : Promise<void> | null = null
let hasEstablishedClient = false

const isDbConnected = (): boolean =>
    mongoose.connection.readyState === mongoose.ConnectionStates.connected

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