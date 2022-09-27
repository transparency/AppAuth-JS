/// <reference types="node" />
import * as Http from "http";
import { RequestListener } from "http";
export declare class ServerHolder {
    server: Http.Server | null;
    private static instance;
    private constructor();
    static get(): ServerHolder;
    createServer(httpServerPort?: number, requestListener?: RequestListener): void;
    close(): void;
}
