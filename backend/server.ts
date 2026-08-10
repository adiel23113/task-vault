
import {logger} from "@utils/logger.js";
import {createServer} from 'node:http';
import {connectDb, disconnectDb} from '@config/db.js';
import {env} from "@config/env.js";
import { app } from '@app';
import {setTimeout as delay} from 'node:timers/promises'


const listen_errors: Readonly<Record<string, string>> = {
    EADDRINUSE: 'is already in use',
    ACCESS: 'requires elevated privileges'
}

const shutdown_timeout = 15_000
const keepAlive_timeout = 65_000
const request_timeout = 30_000
const headers_timeout = keepAlive_timeout + 5_000
const drain_delay = env.isProduction?5_000:0

let isShuttingDown = false
let server: ReturnType<typeof createServer>| null = null;
 const closeHttpServer = ()
const shutdown = async (reason: string, exitCode =0): Promise<void> =>{
    if(isShuttingDown) return
    isShuttingDown = true
    logger.info({reason,exitCode},'shutting down gracefully')

    const forceTimer = setTimeout(()=> {
    logger.error({timeOut:shutdown_timeout},'graceful shutdown time out,forcing exit')
        server?.closeAllConnections()
    },shutdown_timeout)
    forceTimer.unref()
    if (exitCode === 0 && drain_delay > 0) {
        logger.info({drainDelay: drain_delay}, 'draining before closinf listener')
        await delay(drain_delay)
    }
     const steps:ReadonlyArray<readonly [label:string,close:()=> Promise<void>]=[
         ['http server',closeHttpServer],
         ['database connection',disconnectDb()]
     ]
}

const attachProcessHandlers = (): void => {
    const onFatal = (reason: string, level: 'fatal' | 'error') =>
        (err: unknown): void => {
            logger[level]({err}, `${reason} - initiating shutdown`)
        }
    process.on('uncaughtException', onFatal('uncaughtException', 'fatal'))
    process.on('unhandledRejection', onFatal('unhandledRejection', 'error'))

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGQUIT']
    for (const signal of signals) {
        process.on(signal, () => {
            logger.info({signal}, 'received termination signal')
        })
        }
}

const startServer = async(): Promise<void> => {
    await connectDb()
   const httpServer = createServer(app)
     server = httpServer

    httpServer.keepAliveTimeout = keepAlive_timeout;
    httpServer.headersTimeout = headers_timeout
    httpServer.requestTimeout = request_timeout

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
        const listenError = listen_errors[err.code ?? '']

        logger.fatal({err, ...(listenError && {port: env.PORT})}, listenError ? `port ${env.PORT}
         ${listenError}` : 'server encountered a fatal error')

    })
    await new Promise<void>(resolve => {

        httpServer.listen(env.PORT, resolve)
    })
}

try {
    await startServer();
} catch (err) {
    logger.fatal({ err }, 'failed to start server');
    process.exit(1);
}


