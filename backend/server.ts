import { connectDb } from "@config/db.js";
import { createServer, type Server } from "node:net";
import { app } from "@app";
import {promise} from "zod/v3";
import {resolve} from "node:dns";
import {rejects} from "node:assert";

const connections_checking_interval = 5_000;
const keep_alive_timeout = 65_000;
const headers_timeout = 30_000;
const request_timeout = 300_000;

let shuttingDown = false;
let server: Server | null = null;
const listen = (httpServer: Server,port: number)=>
    new Promise<void>((resolve, reject)=>{
        httpServer.once('error',reject)
        httpServer.listen(port, () =>{
            httpServer.removeListener('error',reject)
            resolve()
        })

    })

const startServer = async (): Promise<void> => {
    await connectDb();
    if (shuttingDown) return;

    const httpServer = createServer({
        connectionsCheckingInterval: connections_checking_interval,
    }, app);

    server = httpServer;
    httpServer.keepAliveTimeout = keep_alive_timeout;
    httpServer.headersTimeout = headers_timeout;
    httpServer.requestTimeout = request_timeout;
};