import { NodeStats } from '../typings/Lavalink';
import { LavalinkManager } from '../typings/lib';
import { TypedEmitter } from '../util/TypedEmitter';
import { Dispatcher, request } from 'undici';
/**
 * {@link Node} events.
 */
export interface NodeEvents {
    /**
     * Emitted when the node connects to the lavalink server.
     */
    CONNECTED: Node;
    /**
     * Emitted when the node is created.
     */
    CREATED: Node;
    /**
     * Emitted when the node is destroyed.
     */
    DESTROYED: {
        node: Node;
        reason: string;
    };
    /**
     * Emitted when the node disconnects from the lavalink server.
     */
    DISCONNECTED: {
        node: Node;
        code: number;
        reason: string;
    };
    /**
     * Emitted when the node encounters an error.
     */
    ERROR: {
        node: Node;
        error: Error;
    };
    /**
     * Emitted when the node receives a payload from the server.
     */
    RAW: {
        node: Node;
        payload: any;
    };
    /**
     * Emitted when the node is attempting to reconnect.
     */
    RECONNECTING: Node;
}
/**
 * Options used when creating a {@link Node node}.
 */
export declare type NodeOptions = Partial<NodeOptionsComplete>;
/**
 * Complete {@link Node node} options.
 */
export interface NodeOptionsComplete {
    /**
     * The client name to use.
     * @default 'rose-lavalink'
     */
    clientName: string;
    /**
     * The amount of time to allow to connect to the lavalink server before timing out.
     * This must be less than the connect / reconnect retry delay.
     * @default 15000
     */
    connectionTimeout: number;
    /**
     * The default {@link NodeRequestOptions request options} to use.
     */
    defaultRequestOptions: Omit<NodeRequestOptions, `body` | `query`>;
    /**
     * The host for the node to use.
     * @default 'localhost'
     */
    host: string;
    /**
     * The maximum number of times to try to connect or reconnect. Setting this to 0 removes the limit.
     * @default 10
     */
    maxRetrys: number;
    /**
     * The password for the node to use.
     * @default 'youshallnotpass'
     */
    password: string;
    /**
     * The port for the node to use.
     * @default 2333
     */
    port: number;
    /**
     * The time to wait before timing out a request.
     * @default 15000
     */
    requestTimeout: number;
    /**
     * A resume key to use when starting the node.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#resuming-lavalink-sessions)
     */
    resumeKey?: string;
    /**
     * Data to configure resuming with.
     * If undefined resuming will not be configured.
     * @default undefined
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#resuming-lavalink-sessions)
     */
    resumeKeyConfig?: {
        /**
         * The resume key.
         */
        key: string;
        /**
         * The time in milliseconds after the wrapper disconnects that the lavalink server's session should be closed anyways.
         */
        timeout: number;
    };
    /**
     * The time in milliseconds to wait between connection or reconnection attempts.
     * This must be greater than the connection timeout.
     * @default 30000
     */
    retryDelay: number;
    /**
     * If the websocket connection is secure.
     * @default false
     */
    secure: boolean;
}
/**
 * {@link Node} rest request methods.
 */
export declare type NodeRequestMethods = `GET` | `POST` | `PUT` | `PATCH` | `DELETE`;
/**
 * Options for rest requests on a {@link Node node}.
 * Extends undici request options.
 * @see [Undici Documentation](https://undici.nodejs.org/#/?id=undicirequesturl-options-promise)
 */
export interface NodeRequestOptions extends Omit<NonNullable<Parameters<typeof request>[1]>, `method` | `bodyTimeout`> {
    /**
     * The request query.
     */
    query?: Record<string, any>;
    /**
     * The amount of time in milliseconds to wait before considering a request timed out.
     * Defaults to [undici's](https://undici.nodejs.org) `bodyTimeout` from [DispatchOptions](https://undici.nodejs.org/#/docs/api/Dispatcher?id=parameter-dispatchoptions).
     */
    timeout?: number;
}
/**
 * A {@link Node node}'s state.
 */
export declare enum NodeState {
    DISCONNECTED = 0,
    CONNECTING = 1,
    RECONNECTING = 2,
    CONNECTED = 3,
    DESTROYED = 4
}
/**
 * A lavalink node.
 * Communicates with a lavalink server.
 */
export declare class Node extends TypedEmitter<NodeEvents> {
    /**
     * The node's {@link LavalinkManager manager}.
     */
    manager: LavalinkManager;
    /**
     * The node's {@link NodeState state}.
     */
    state: NodeState;
    /**
     * The {@link NodeStats node's stats}.
     */
    stats: NodeStats;
    /**
     * The node's ID.
     */
    readonly id: number;
    /**
     * The node's {@link NodeOptionsComplete options}.
     */
    readonly options: NodeOptionsComplete;
    /**
     * Incremented when reconnecting to compare to Node#options#maxRetrys.
     */
    private _reconnectAttempts;
    /**
     * Used for delaying reconnection attempts.
     */
    private _reconnectTimeout;
    /**
     * The node's websocket.
     */
    private _ws;
    /**
     * Create a node.
     * @param id The node's ID.
     * @param manager The node's {@link LavalinkManager manager}.
     * @param options The {@link NodeOptions options} to use for the node.
     */
    constructor(id: number, manager: LavalinkManager, options?: NodeOptions);
    /**
     * Connect the node to the lavalink server.
     */
    connect(): Promise<void>;
    /**
     * Destroy the node and all attatched players.
     * @param reason The reason the node was destroyed.
     */
    destroy(reason?: string): void;
    /**
     * Send data to the lavalink server.
     * @param msg The data to send.
     */
    send(msg: any): Promise<boolean>;
    /**
     * Make a rest request.
     * @param method The method to use.
     * @param route The route to use.
     * @param options Request options.
     * @returns The response from the server.
     */
    request(method: NodeRequestMethods, route: string, options?: NodeRequestOptions): Promise<{
        res: Dispatcher.ResponseData;
        json: any;
    }>;
    /**
     * Attempt to reconnect the node to the server.
     */
    private _reconnect;
    /**
     * Fired when the websocket emits an open event.
     */
    private _onOpen;
    /**
     * Fired when the websocket emits a close event.
     * @param code The event's code.
     * @param reason The close reason.
     */
    private _onClose;
    /**
     * Fired when the websocket emits an error event.
     * @param error The error thrown.
     */
    private _onError;
    /**
     * Fired when the websocket receives a message payload
     * @param data The received data.
     */
    private _onMessage;
}
