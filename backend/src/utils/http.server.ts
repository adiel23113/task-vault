import type {Server} from "node:http";
import type {AddressInfo} from "node:net";

type ServerErrorHandler = (err: Error) => void;

export const listenServer = (httpServer: Server, port: number, onRunTimeError?: ServerErrorHandler): Promise<AddressInfo> =>
  new Promise<AddressInfo>((resolve, reject) => {
    const onError = (err: Error) => {
      reject(err);
    };