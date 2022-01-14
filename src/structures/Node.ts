import { LavalinkManager as LavalinkManagerClass } from './LavalinkManager';

import { NodeStats } from '../typings/Lavalink';
import { LavalinkManager } from '../typings/lib';
import { TypedEmitter } from '../util/TypedEmitter';

import { Dispatcher, request } from 'undici';
import { URLSearchParams } from 'url';
import WebSocket from 'ws';

/**
 * {@link Node} events.
 */
export interface NodeEvents {
    /**
     * Emitted when the node connects to the lavalink server.
     */
    CONNECTED: Node
    /**
     * Emitted when the node is created.
     */
    CREATED: Node
    /**
     * Emitted when the node is destroyed.
     */
    DESTROYED: { node: Node, reason: string }
    /**
     * Emitted when the node disconnects from the lavalink server.
     */
    DISCONNECTED: { node: Node, code: number, reason: string }
    /**
     * Emitted when the node encounters an error.
     */
    ERROR: { node: Node, error: Error }
    /**
     * Emitted when the node receives a payload from the server.
     */
    RAW: { node: Node, payload: any }
    /**
     * Emitted when the node is attempting to reconnect.
     */
    RECONNECTING: Node
}

/**
 * Options used when creating a {@link Node node}.
 */
export type NodeOptions = Partial<NodeOptionsComplete>

/**
 * Complete {@link Node node} options.
 */
export interface NodeOptionsComplete {
    /**
     * The client name to use.
     * @default 'rose-lavalink'
     */
    clientName: string
    /**
     * The amount of time to allow to connect to the lavalink server before timing out.
     * This must be less than the connect / reconnect retry delay.
     * @default 15000
     */
    connectionTimeout: number
    /**
     * The default {@link NodeRequestOptions request options} to use.
     */
    defaultRequestOptions: Omit<NodeRequestOptions, `body` | `query`>
    /**
     * The host for the node to use.
     * @default 'localhost'
     */
    host: string
    /**
     * The maximum number of times to try to connect or reconnect. Setting this to 0 removes the limit.
     * @default 10
     */
    maxRetrys: number
    /**
     * The password for the node to use.
     * @default 'youshallnotpass'
     */
    password: string
    /**
     * The port for the node to use.
     * @default 2333
     */
    port: number
    /**
     * The time to wait before timing out a request.
     * @default 15000
     */
    requestTimeout: number
    /**
     * A resume key to use when starting the node.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#resuming-lavalink-sessions)
     */
    resumeKey?: string
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
        key: string
        /**
         * The time in milliseconds after the wrapper disconnects that the lavalink server's session should be closed anyways.
         */
        timeout: number
    }
    /**
     * The time in milliseconds to wait between connection or reconnection attempts.
     * This must be greater than the connection timeout.
     * @default 30000
     */
    retryDelay: number
    /**
     * If the websocket connection is secure.
     * @default false
     */
    secure: boolean
}

/**
 * {@link Node} rest request methods.
 */
export type NodeRequestMethods = `GET` | `POST` | `PUT` | `PATCH` | `DELETE`

/**
 * Options for rest requests on a {@link Node node}.
 * Extends undici request options.
 * @see [Undici Documentation](https://undici.nodejs.org/#/?id=undicirequesturl-options-promise)
 */
export interface NodeRequestOptions extends Omit<NonNullable<Parameters<typeof request>[1]>, `method` | `bodyTimeout`> {
    /**
     * The request query.
     */
    query?: Record<string, any>
    /**
     * The amount of time in milliseconds to wait before considering a request timed out.
     * Defaults to [undici's](https://undici.nodejs.org) `bodyTimeout` from [DispatchOptions](https://undici.nodejs.org/#/docs/api/Dispatcher?id=parameter-dispatchoptions).
     */
    timeout?: number
}

/**
 * A {@link Node node}'s state.
 */
export enum NodeState {
    DISCONNECTED,
    CONNECTING,
    RECONNECTING,
    CONNECTED,
    DESTROYED
}

/**
 * A lavalink node.
 * Communicates with a lavalink server.
 */
export class Node extends TypedEmitter<NodeEvents> {
    /**
     * The node's {@link LavalinkManager manager}.
     */
    public manager: LavalinkManager;
    /**
     * The node's {@link NodeState state}.
     */
    public state: NodeState = NodeState.DISCONNECTED;
    /**
     * The {@link NodeStats node's stats}.
     */
    public stats: NodeStats = {
        players: 0,
        playingPlayers: 0,
        uptime: 0,
        memory: {
            free: 0,
            used: 0,
            allocated: 0,
            reservable: 0
        },
        cpu: {
            cores: 0,
            systemLoad: 0,
            lavalinkLoad: 0
        },
        frameStats: {
            sent: 0,
            nulled: 0,
            deficit: 0
        }
    };

    /**
     * The node's ID.
     */
    // @ts-expect-error Property 'id' has no initializer and is not definitely assigned in the constructor.
    public readonly id: number;
    /**
     * The node's {@link NodeOptionsComplete options}.
     */
    // @ts-expect-error Property 'options' has no initializer and is not definitely assigned in the constructor.
    public readonly options: NodeOptionsComplete;

    /**
     * Incremented when reconnecting to compare to Node#options#maxRetrys.
     */
    private _reconnectAttempts = 0;
    /**
     * Used for delaying reconnection attempts.
     */
    private _reconnectTimeout: NodeJS.Timeout | null = null;
    /**
     * The node's websocket.
     */
    private _ws: WebSocket | null = null;

    /**
     * Create a node.
     * @param id The node's ID.
     * @param manager The node's {@link LavalinkManager manager}.
     * @param options The {@link NodeOptions options} to use for the node.
     */
    constructor (id: number, manager: LavalinkManager, options: NodeOptions = {}) {
        super();

        if (typeof id !== `number`) throw new TypeError(`A node ID must be specified`);
        if (!(manager instanceof LavalinkManagerClass)) throw new TypeError(`A manager must be specified`);

        Object.defineProperty(this, `id`, {
            configurable: false,
            enumerable: false,
            value: id as Node[`id`],
            writable: false
        });
        Object.defineProperty(this, `options`, {
            configurable: false,
            enumerable: true,
            value: Object.freeze({
                host: options.host ?? `localhost`,
                port: options.port ?? 2333,
                password: options.password ?? `youshallnotpass`,
                secure: options.secure ?? false,
                resumeKey: options.resumeKey,
                resumeKeyConfig: options.resumeKeyConfig,
                clientName: options.clientName ?? `rose-lavalink`,
                connectionTimeout: options.connectionTimeout ?? 15000,
                requestTimeout: options.requestTimeout ?? 15000,
                maxRetrys: options.maxRetrys ?? 10,
                retryDelay: options.retryDelay ?? 15000,
                defaultRequestOptions: options.defaultRequestOptions ?? {}
            }) as Node[`options`],
            writable: false
        });

        this.manager = manager;

        // @ts-expect-error Property 'options' is used before being assigned.
        if (this.options.connectionTimeout > this.options.retryDelay) throw new Error(`Node connection timeout must be greater than the reconnect retry delay`);

        this.on(`CONNECTED`, (data) => this.manager.emit(`NODE_CONNECTED`, data));
        this.on(`CREATED`, (data) => this.manager.emit(`NODE_CREATED`, data));
        this.on(`DESTROYED`, (data) => this.manager.emit(`NODE_DESTROYED`, data));
        this.on(`DISCONNECTED`, (data) => this.manager.emit(`NODE_DISCONNECTED`, data));
        this.on(`ERROR`, (data) => this.manager.emit(`NODE_ERROR`, data));
        this.on(`RAW`, (data) => this.manager.emit(`NODE_RAW`, data));
        this.on(`RECONNECTING`, (data) => this.manager.emit(`NODE_RECONNECTING`, data));

        this.emit(`CREATED`, this);
    }

    /**
     * Connect the node to the lavalink server.
     */
    public async connect (): Promise<void> {
        if (this.state !== NodeState.DISCONNECTED && this.state !== NodeState.RECONNECTING) throw new Error(`Cannot initiate a connection when the node isn't in a disconnected or reconnecting state`);

        const headers: Record<string, any> = {
            'Authorization': this.options.password,
            'User-Id': this.manager.adapter.getBotId(),
            'Client-Name': this.options.clientName
        };
        if (this.options.resumeKey) headers.set(`Resume-Key`, this.options.resumeKey);

        return await new Promise((resolve, reject) => {
            const timedOut = setTimeout(() => {
                const error = new Error(`Timed out while connecting to the lavalink server`);
                this.emit(`ERROR`, {
                    node: this, error
                });
                reject(error);
            }, this.options.connectionTimeout);

            this._ws = new WebSocket(`ws${this.options.secure ? `s` : ``}://${this.options.host}:${this.options.port}/`, { headers: headers.raw() });
            if (this.state !== NodeState.RECONNECTING) this.state = NodeState.CONNECTING;

            this._ws.once(`error`, (error) => {
                this._ws!.removeAllListeners();
                this._ws = null;
                if (this.state !== NodeState.RECONNECTING) this.state = NodeState.DISCONNECTED;
                this._onError(error);
                if (timedOut) clearTimeout(timedOut);
                reject(error);
            });

            this._ws.once(`open`, async () => {
                this._ws!.removeAllListeners();
                this._onOpen();
                this._ws!.on(`open`, this._onOpen.bind(this));
                this._ws!.on(`close`, this._onClose.bind(this));
                this._ws!.on(`error`, this._onError.bind(this));
                this._ws!.on(`message`, this._onMessage.bind(this));
                if (timedOut) clearTimeout(timedOut);
                if (this.options.resumeKeyConfig) {
                    await this.send({
                        op: `configureResuming`,
                        key: this.options.resumeKeyConfig.key,
                        timeout: Math.round(this.options.resumeKeyConfig.timeout / 1000)
                    }).catch((error) => reject(error));
                }
                resolve(undefined);
            });
        });
    }

    /**
     * Destroy the node and all attatched players.
     * @param reason The reason the node was destroyed.
     */
    public destroy (reason = `Manual destroy`): void {
        this._ws?.close(1000, `destroy`);
        this._ws?.removeAllListeners();
        this._ws = null;

        this._reconnectAttempts = 0;
        if (this._reconnectTimeout) {
            clearInterval(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }

        this.manager.players.filter((player) => player.node.id === this.id).forEach((player) => player.destroy(`Attached node destroyed`));

        this.state = NodeState.DESTROYED;
        this.emit(`DESTROYED`, {
            node: this, reason
        });
        this.removeAllListeners();

        this.manager.nodes.delete(this.id);
    }

    /**
     * Send data to the lavalink server.
     * @param msg The data to send.
     */
    public async send (msg: any): Promise<boolean> {
        if (this.state !== NodeState.CONNECTED) throw new Error(`Cannot send payloads before a connection is established`);
        return await new Promise((resolve, reject) => {
            this._ws?.send(JSON.stringify(msg), (error) => {
                if (error) {
                    this.emit(`ERROR`, {
                        node: this, error
                    });
                    reject(error);
                } else resolve(true);
            });
        });
    }

    /**
     * Make a rest request.
     * @param method The method to use.
     * @param route The route to use.
     * @param options Request options.
     * @returns The response from the server.
     */
    public async request (method: NodeRequestMethods, route: string, options: NodeRequestOptions = {}): Promise<{ res: Dispatcher.ResponseData, json: any }> {
        const headers: Record<string, any> = {
            ...this.options.defaultRequestOptions.headers,
            ...options.headers,
            'Authorization': this.options.password
        };
        if (options.body) headers[`Content-Type`] = `application/json`;

        const res = await request(`http${this.options.secure ? `s` : ``}://${this.options.host}:${this.options.port}/${route.replace(/^\//gm, ``)}${options.query ? `?${new URLSearchParams(options.query).toString()}` : ``}`, {
            ...this.options.defaultRequestOptions,
            ...options,
            method,
            headers,
            body: JSON.stringify(options.body),
            bodyTimeout: options.timeout ?? this.options.defaultRequestOptions.timeout
        });

        return {
            res, json: res.statusCode === 204 ? null : await res.body.json()
        };
    }

    /**
     * Attempt to reconnect the node to the server.
     */
    private _reconnect (): void {
        this.state = NodeState.RECONNECTING;
        this._reconnectTimeout = setInterval(() => {
            if (this.options.maxRetrys !== 0 && this._reconnectAttempts >= this.options.maxRetrys) {
                this.emit(`ERROR`, {
                    node: this, error: new Error(`Unable to reconnect after ${this._reconnectAttempts} attempts.`)
                });
                return this.destroy();
            }
            this._ws?.removeAllListeners();
            this._ws = null;
            this.state = NodeState.RECONNECTING;
            this.emit(`RECONNECTING`, this);
            this.connect().catch(() => this._reconnectAttempts++);
        }, this.options.retryDelay);
    }

    /**
     * Fired when the websocket emits an open event.
     */
    private _onOpen (): void {
        if (this._reconnectTimeout) {
            clearInterval(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }
        this.state = NodeState.CONNECTED;
        this.emit(`CONNECTED`, this);
    }

    /**
     * Fired when the websocket emits a close event.
     * @param code The event's code.
     * @param reason The close reason.
     */
    private _onClose (code: number, reason: string): void {
        this.state = NodeState.DISCONNECTED;
        this.emit(`DISCONNECTED`, {
            node: this, code, reason: reason.length ? reason : `No reason specified`
        });
        if (code !== 1000 && reason !== `destroy`) this._reconnect();
    }

    /**
     * Fired when the websocket emits an error event.
     * @param error The error thrown.
     */
    private _onError (error: Error): void {
        if (!error) return;
        this.emit(`ERROR`, {
            node: this, error
        });
    }

    /**
     * Fired when the websocket receives a message payload
     * @param data The received data.
     */
    private _onMessage (data: Buffer | string): void {
        if (Array.isArray(data)) data = Buffer.concat(data);
        else if (data instanceof ArrayBuffer) data = Buffer.from(data);
        const payload = JSON.parse(data.toString());
        this.emit(`RAW`, {
            node: this, payload
        });

        switch (payload.op) {
            case `event`:
            case `playerUpdate`:{
                break;
            }
            case `stats`: {
                delete payload.op;
                this.stats = { ...payload };
                break;
            }
            default: {
                this.emit(`ERROR`, {
                    node: this, error: new Error(`Received unexpected op "${payload.op as string | number}"`)
                });
                break;
            }
        }
    }
}
