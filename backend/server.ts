import { connectDb } from "@config/db.js";
import { createServer, type Server } from "node:http";
import { app } from "@app";
import {clearTimeout, setInterval} from "node:timers";
import { env } from "@config/env.js";
import { logger } from "@utils/logger.js";
import { setTimeout as delay } from 'node:timers/promises'
import { listenServer } from "@utils/http.server.js";


const connections_checking_interval = 5_000;
const keep_alive_timeout = 65_000;
const headers_timeout = 30_000;
const request_timeout = 300_000;
const idle_sweep_interval = 1_000
const drainDelay = env.isProduction ? 5_000 : 0
const shutdownTimeout = 35_000

let shuttingDown = false;
let server: Server | null = null;
let httpClosePromise: Promise<void> | null = null;
let listenPromise: Promise<void> | null = null;
let pendingExitCode = 0;
let drainController: AbortController | null = null;

const logCrashSafely = (
    level: 'fatal' | 'error',
    bindings: Record<string, unknown>,
    message: string
): void => {
    try {
        logger[level](bindings, message)
    } catch {
        try {
            logger[level](`${message} error details unserializable`)
        } catch {
            console.error()
        }
    }
}

export const closeHttpServer = async (): Promise<void> => {
    if (httpClosePromise) return httpClosePromise;

    const activeServer = server;
    if (!activeServer) return;

    httpClosePromise = (async (): Promise<void> => {
        if (listenPromise) await listenPromise;

        if (!activeServer?.listening) return;

        const idleSweeper = setInterval(() => {
            activeServer.closeIdleConnections();
        }, idle_sweep_interval);

        try {
            await new Promise<void>((resolve, reject) => {
                activeServer.close((err) => (err ? reject(err) : resolve()));
            });
        } finally {
            clearInterval(idleSweeper);
        }

        logger.info("http server closed");
    })();

    return httpClosePromise;
};


 const listen = (httpServer: Server, port: number): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, () => {
            httpServer.removeListener("error", reject);
            resolve();
        });
    });
const shutdown = async (reason: string, exitCode: number): Promise<void> => {
    if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode

    if (shuttingDown) {
        if (exitCode !== 0) {
            drainController?.abort()
            server?.closeAllConnections()
            logger.error({reason, exitCode}, 'fatal error during shutdown')
        }
        return
    }
    shuttingDown = true
    logger.info({reason, exitCode}, 'shutting down')
    if (pendingExitCode === 0 && drainDelay > 0) {
        logger.info({drainDelay: drainDelay}, 'draining before closing listener')
        drainController =`` new AbortController()
        try {
            await delay(drainDelay, undefined, {signal: drainController.signal})
        } catch (err) {
            if (!drainController.signal.aborted) throw err
        } finally {
            drainController = null
        }
    }
    if (pendingExitCode !== 0) server?.closeAllConnections()

    const steps: ReadonlyArray<readonly [label: string, close: () => Promise<void>]> = [
        ['HTTP server', closeHttpServer],
        ['database connection', disconnectDb],
    ];

    const forceTimer = setTimeout(()=>{
        server?.closeAllConnections();
        try {
            logger.error({timeoutMs: shutdownTimeout},'Graceful shutdown time out, forcing')
        }catch {}
    },shutdownTimeout)
    for (const [label,close] of steps) {
        try {
            await close();

        }catch (err){
            pendingExitCode = 1;
            logger.error({err},`failed to close ${label}`)
        }
    }
    clearTimeout(forceTimer)
}
export const startServer = async (): Promise<void> => {
    await connectDb();
    if (shuttingDown) return;

    const httpServer = createServer({
        connectionsCheckingInterval: connections_checking_interval,
    }, app);

    server = httpServer;
    httpServer.keepAliveTimeout = keep_alive_timeout;
    httpServer.headersTimeout = headers_timeout;
    httpServer.requestTimeout = request_timeout;
    if(shuttingDown) return
    const pendinglisten = (listenPromise = listenServer(httpServer,env.PORT))
    try {
        await pendinglisten
    } finally {
        if(listenPromise === pendingListen) listenPromise = null
        }
    if (shuttingDown){
        await closeHttpServer()
        return
    }
    httpServer.on('error',(err: NodeJS.ErrnoException) =>{
        logCrashSafely('fatal', {err}, 'server encountered a fatal error')
    })
}