import { Manager } from './Manager';
import { LogCallback } from '../types/Log';
import { TypedEmitter } from '@br88c/node-utils';
import { RestMethod, RestRoute } from 'distype';
import { request } from 'undici';
/**
 * {@link Node} events.
 */
export declare type NodeEvents = {
    /**
     * When the {@link Node node} receives a payload.
     */
    RECEIVED_MESSAGE: (payload: any) => void;
    /**
     * When a payload is sent.
     */
    SENT_PAYLOAD: (payload: string) => void;
    /**
     * When the {@link Node node} enters an {@link NodeState idle state}.
     */
    IDLE: () => void;
    /**
     * When the {@link Node node} enters a {@link NodeState connecting state}.
     */
    CONNECTING: () => void;
    /**
     * When the {@link Node node} enters a {@link NodeState running state}.
     */
    RUNNING: () => void;
    /**
     * When the {@link Node node} enters a {@link NodeState disconnected state}.
     */
    DISCONNECTED: () => void;
};
/**
 * {@link Node} options.
 */
export interface NodeOptions {
    /**
     * Default REST request options.
     * @default {}
     */
    defaultRequestOptions?: Omit<NodeRequestOptions, `body` | `query`>;
    /**
     * The node's location.
     */
    location: {
        /**
         * The node's host.
         */
        host: string;
        /**
         * The node's port.
         */
        port: number;
        /**
         * If the location is secure.
         */
        secure: boolean;
    };
    /**
     * The node's password.
     */
    password: string;
    /**
     * Data to configure resuming with.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#resuming-lavalink-sessions)
     * @default null
     */
    resumeKeyConfig?: {
        /**
         * The resume key.
         */
        key: string;
        /**
         * The time in milliseconds after the wrapper disconnects that the Lavalink server's session should be closed anyways.
         */
        timeout: number;
    } | null;
    /**
     * The number of milliseconds to wait between spawn and resume attempts.
     * @default 2500
     */
    spawnAttemptDelay?: number;
    /**
     * The maximum number of spawn attempts before rejecting.
     * @default 10
     */
    spawnMaxAttempts?: number;
}
/**
 * Options for {@link Node node} REST requests.
 * Extends undici request options.
 * @see [Undici Documentation](https://undici.nodejs.org/#/?id=undicirequesturl-options-promise)
 */
export interface NodeRequestOptions extends Omit<NonNullable<Parameters<typeof request>[1]>, `body` | `bodyTimeout` | `method`> {
    /**
     * The request body.
     */
    body?: Record<string, any>;
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
 * {@link Node} states.
 */
export declare enum NodeState {
    IDLE = 0,
    CONNECTING = 1,
    RUNNING = 2,
    DISCONNECTED = 3
}
/**
 * Statistics about a {@link Node node} sent from the Lavalink server.
 */
export interface NodeStats {
    /**
     * The number of players on the node.
     */
    players: number;
    /**
     * The number of players playing on the node.
     */
    playingPlayers: number;
    /**
     * The node's uptime.
     */
    uptime: number;
    /**
     * Memory stats.
     */
    memory: {
        free: number;
        used: number;
        allocated: number;
        reservable: number;
    };
    /**
     * CPU stats.
     */
    cpu: {
        cores: number;
        systemLoad: number;
        lavalinkLoad: number;
    };
    /**
     * Frame stats.
     */
    frameStats?: {
        sent: number;
        nulled: number;
        deficit: number;
    };
}
/**
 * A Lavalink node.
 */
export declare class Node extends TypedEmitter<NodeEvents> {
    /**
     * The node's {@link Manager manager}.
     */
    manager: Manager;
    /**
     * The node's {@link NodeState state.}
     */
    state: NodeState;
    /**
     * The node's {@link NodeStats stats}.
     */
    stats: NodeStats;
    /**
     * The node's ID.
     */
    readonly id: number;
    /**
     * {@link NodeOptions Options} for the node.
     */
    readonly options: Required<NodeOptions>;
    /**
     * The system string used for emitting errors and for the {@link LogCallback log callback}.
     */
    readonly system: `Lavalink Node ${number}`;
    /**
     * If the node was killed. Set back to `false` when a new connection attempt is started.
     */
    private _killed;
    /**
     * The {@link LogCallback log callback} used by the node.
     */
    private _log;
    /**
     * If the node has an active spawn loop.
     */
    private _spinning;
    /**
     * The websocket used.
     */
    private _ws;
    /**
     * Create a Lavalink node.
     * @param id The node's ID.
     * @param manager The node's {@link Manager manager}.
     * @param options The node's {@link NodeOptions options}.
     * @param logCallback A {@link LogCallback callback} to be used for logging events internally in the node.
     * @param logThisArg A value to use as `this` in the `logCallback`.
     */
    constructor(id: number, manager: Manager, options: NodeOptions, logCallback?: LogCallback, logThisArg?: any);
    /**
     * Connect to the node.
     * The node must be in a {@link NodeState DISCONNECTED} state.
     */
    spawn(): Promise<void>;
    /**
     * Kill the node.
     * @param code A socket [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code). Defaults to `1000`.
     * @param reason The reason the node is being killed. Defaults to `"Manual kill"`.
     */
    kill(code?: number, reason?: string): void;
    /**
     * Send data to the node.
     * @param data The data to send.
     */
    send(data: any): Promise<void>;
    /**
     * Make a REST request.
     * @param method The method to use.
     * @param route The route to use.
     * @param options Request options.
     * @returns The response from the server.
     */
    request(method: RestMethod, route: RestRoute, options?: NodeRequestOptions): Promise<any>;
    /**
     * Get the node's socket ping.
     * @returns The node's ping in milliseconds.
     */
    getPing(): Promise<number>;
    /**
     * Closes the connection, and cleans up helper variables.
     * @param code A socket [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code).
     * @param reason The reason the node is being closed.
     */
    private _close;
    /**
     * Enter a state.
     * @param state The state to enter.
     */
    private _enterState;
    /**
     * Initiate the socket.
     */
    private _initSocket;
    /**
     * Parses an incoming payload.
     * @param data The data to parse.
     * @returns The parsed data.
     */
    private _parsePayload;
    /**
     * When the socket emits a close event.
     */
    private _wsOnClose;
    /**
     * When the socket emits an error event.
     */
    private _wsOnError;
    /**
     * When the socket emits a message event.
     */
    private _wsOnMessage;
}
