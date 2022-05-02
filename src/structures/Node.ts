import { Manager } from './Manager';

import { LogCallback } from '../types/Log';

import { TypedEmitter, wait } from '@br88c/node-utils';
import { RestMethod, RestRoute } from 'distype';
import { request } from 'undici';
import { RawData, WebSocket } from 'ws';

/**
 * {@link Node} events.
 */
export type NodeEvents = {
    /**
     * When the {@link Node node} receives a payload.
     */
    RECEIVED_MESSAGE: (payload: any) => void
    /**
     * When a payload is sent.
     */
    SENT_PAYLOAD: (payload: string) => void
    /**
     * When the {@link Node node} enters an {@link NodeState idle state}.
     */
    IDLE: () => void
    /**
     * When the {@link Node node} enters a {@link NodeState connecting state}.
     */
    CONNECTING: () => void
    /**
     * When the {@link Node node} enters a {@link NodeState running state}.
     */
    RUNNING: () => void
    /**
     * When the {@link Node node} enters a {@link NodeState disconnected state}.
     */
    DISCONNECTED: () => void
}

/**
 * {@link Node} options.
 */
export interface NodeOptions {
    /**
     * Default REST request options.
     * @default {}
     */
    defaultRequestOptions?: Omit<NodeRequestOptions, `body` | `query`>
    /**
     * The node's location.
     */
    location: {
        /**
         * The node's host.
         */
        host: string
        /**
         * The node's port.
         */
        port: number
        /**
         * If the location is secure.
         */
        secure: boolean
    }
    /**
     * The node's password.
     */
    password: string
    /**
     * Data to configure resuming with.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#resuming-lavalink-sessions)
     * @default null
     */
    resumeKeyConfig?: {
        /**
         * The resume key.
         */
        key: string
        /**
         * The time in milliseconds after the wrapper disconnects that the Lavalink server's session should be closed anyways.
         */
        timeout: number
    } | null
    /**
     * The number of milliseconds to wait between spawn and resume attempts.
     * @default 2500
     */
    spawnAttemptDelay?: number
    /**
     * The maximum number of spawn attempts before rejecting.
     * @default 10
     */
    spawnMaxAttempts?: number
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
    body?: Record<string, any>
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
 * {@link Node} states.
 */
export enum NodeState {
    IDLE,
    CONNECTING,
    RUNNING,
    DISCONNECTED
}

/**
 * Statistics about a node sent from the Lavalink server.
 */
export interface NodeStats {
    /**
     * The number of players on the node.
     */
    players: number
    /**
     * The number of players playing on the node.
     */
    playingPlayers: number
    /**
     * The node's uptime.
     */
    uptime: number
    /**
     * Memory stats.
     */
    memory: {
        free: number
        used: number
        allocated: number
        reservable: number
    }
    /**
     * CPU stats.
     */
    cpu: {
        cores: number
        systemLoad: number
        lavalinkLoad: number
    }
    /**
     * Frame stats.
     */
    frameStats?: {
        sent: number
        nulled: number
        deficit: number
    }
}

/**
 * A Lavalink node.
 */
export class Node extends TypedEmitter<NodeEvents> {
    /**
     * The node's {@link Manager manager}.
     */
    public manager: Manager;
    /**
     * The node's {@link NodeState state.}
     */
    public state: NodeState = NodeState.IDLE;
    /**
     * The node's {@link NodeStats stats}.
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
    public readonly id: number;
    /**
     * {@link NodeOptions Options} for the node.
     */
    public readonly options: Required<NodeOptions>;
    /**
     * The system string used for emitting errors and for the {@link LogCallback log callback}.
     */
    public readonly system: `Lavalink Node ${number}`;

    /**
     * If the node was killed. Set back to `false` when a new connection attempt is started.
     */
    private _killed = false;
    /**
     * The {@link LogCallback log callback} used by the node.
     */
    private _log: LogCallback;
    /**
     * If the node has an active spawn loop.
     */
    private _spinning = false;
    /**
     * The websocket used.
     */
    private _ws: WebSocket | null = null;

    /**
     * Create a Lavalink node.
     * @param id The node's ID.
     * @param manager The node's {@link Manager manager}.
     * @param options The node's {@link NodeOptions options}.
     * @param logCallback A {@link LogCallback callback} to be used for logging events internally in the node.
     * @param logThisArg A value to use as `this` in the `logCallback`.
     */
    constructor (id: number, manager: Manager, options: NodeOptions, logCallback: LogCallback = (): void => {}, logThisArg?: any) {
        super();

        this.id = id;
        this.system = `Lavalink Node ${id}`;
        this.manager = manager;
        this.options = {
            defaultRequestOptions: options.defaultRequestOptions ?? {},
            location: options.location,
            password: options.password,
            resumeKeyConfig: options.resumeKeyConfig ?? null,
            spawnAttemptDelay: options.spawnAttemptDelay ?? 2500,
            spawnMaxAttempts: options.spawnMaxAttempts ?? 10
        };

        this._log = logCallback.bind(logThisArg);
        this._log(`Initialized node ${id}`, {
            level: `DEBUG`, system: this.system
        });
    }

    /**
     * Connect to the node.
     * The node must be in a {@link NodeState DISCONNECTED} state.
     */
    public async spawn (): Promise<void> {
        if (this._spinning) throw new Error(`Node is already connecting`);

        this._spinning = true;
        this._killed = false;

        for (let i = 0; i < this.options.spawnMaxAttempts; i++) {
            const attempt = await this._initSocket().then(() => true).catch((error) => {
                this._log(`Spawn attempt ${i + 1}/${this.options.spawnMaxAttempts} failed: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                    level: `ERROR`, system: this.system
                });
                return false;
            });

            if (attempt) {
                this._spinning = false;
                this._log(`Spawned after ${i + 1} attempts`, {
                    level: `DEBUG`, system: this.system
                });
                return;
            }

            if (this._killed) {
                this._enterState(NodeState.IDLE);

                this._spinning = false;
                this._log(`Spawning interrupted by kill`, {
                    level: `DEBUG`, system: this.system
                });
                throw new Error(`Node spawn attempts interrupted by kill`);
            }

            if (i < this.options.spawnMaxAttempts - 1) {
                await wait(this.options.spawnAttemptDelay);
            }
        }

        this._spinning = false;
        this._enterState(NodeState.IDLE);
        throw new Error(`Failed to spawn node after ${this.options.spawnMaxAttempts} attempts`);
    }

    /**
     * Kill the node.
     * @param code A socket [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code). Defaults to `1000`.
     * @param reason The reason the node is being killed. Defaults to `"Manual kill"`.
     */
    public kill (code = 1000, reason = `Manual kill`): void {
        this._close(code, reason);
        this._enterState(NodeState.IDLE);

        this._killed = true;

        this._log(`Node killed with code ${code}, reason "${reason}"`, {
            level: `WARN`, system: this.system
        });
    }

    /**
     * Send data to the node.
     * @param data The data to send.
     */
    public async send (data: any): Promise<void> {
        const payload = JSON.stringify(data);

        return await new Promise((resolve, reject) => {
            if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
                reject(new Error(`Cannot send data when the socket is not in an OPEN state`));
            } else {
                this._ws.send(payload, (error) => {
                    if (error) reject(error);
                    else {
                        this._log(`Sent payload (opcode ${data.op})`, {
                            level: `DEBUG`, system: this.system
                        });

                        this.emit(`SENT_PAYLOAD`, payload);

                        resolve();
                    }
                });
            }
        });
    }

    /**
     * Make a REST request.
     * @param method The method to use.
     * @param route The route to use.
     * @param options Request options.
     * @returns The response from the server.
     */
    public async request (method: RestMethod, route: RestRoute, options: NodeRequestOptions = {}): Promise<any> {
        const headers: Record<string, any> = {
            ...this.options.defaultRequestOptions.headers,
            ...options.headers,
            'Authorization': this.options.password
        };
        if (options.body) headers[`Content-Type`] = `application/json`;

        const url = new URL(`http${this.options.location.secure ? `s` : ``}://${this.options.location.host}:${this.options.location.port}${route}`);
        url.search = new URLSearchParams(options.query).toString();

        const req = request(url, {
            ...this.options.defaultRequestOptions,
            ...options,
            method,
            headers,
            body: JSON.stringify(options.body),
            bodyTimeout: options.timeout ?? this.options.defaultRequestOptions.timeout
        });

        let unableToParse: string | boolean = false;
        const res = await req.then(async (r) => ({
            ...r,
            body: r.statusCode !== 204 ? await r.body?.json().catch((error) => {
                unableToParse = (error?.message ?? error) ?? `Unknown reason`;
            }) : undefined
        }));

        if (typeof unableToParse === `string`) throw new Error(`Unable to parse response body: "${unableToParse}"`);

        if (res.statusCode >= 400) throw new Error(`REST status code ${res.statusCode}`);

        return res.body;
    }

    /**
     * Closes the connection, and cleans up helper variables.
     * @param code A socket [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code).
     * @param reason The reason the node is being closed.
     */
    private _close (code: number, reason: string): void {
        this._log(`Closing... (Code ${code}, reason "${reason}")`, {
            level: `DEBUG`, system: this.system
        });

        this._ws?.removeAllListeners();
        if (this._ws?.readyState !== WebSocket.CLOSED) {
            try {
                this._ws?.close(code, reason);
            } catch {
                this._ws?.terminate();
            }
        }
        this._ws = null;
    }

    /**
     * Enter a state.
     * @param state The state to enter.
     */
    private _enterState (state: NodeState): void {
        if (this.state !== state) {
            this.state = state;

            this._log(NodeState[state], {
                level: `DEBUG`, system: this.system
            });

            (this.emit as (event: string) => void)(NodeState[state]);
        }
    }

    /**
     * Initiate the socket.
     */
    private async _initSocket (): Promise<void> {
        if (!this.manager.client.gateway.user) throw new Error(`Gateway user is not defined`);

        if (this.state !== NodeState.IDLE && this.state !== NodeState.DISCONNECTED) {
            this._close(1000, `Restarting`);
            this._enterState(NodeState.DISCONNECTED);
        }

        this._log(`Initiating socket...`, {
            level: `DEBUG`, system: this.system
        });

        this._enterState(NodeState.CONNECTING);

        const result = await new Promise<true>((resolve, reject) => {
            const headers: Record<string, any> = {
                'Authorization': this.options.password,
                'User-Id': this.manager.client.gateway.user!.id,
                'Client-Name': this.manager.options.clientName
            };
            if (this.options.resumeKeyConfig?.key) headers[`Resume-Key`] = this.options.resumeKeyConfig.key;

            this._ws = new WebSocket(`ws${this.options.location.secure ? `s` : ``}://${this.options.location.host}:${this.options.location.port}/`, { headers });

            this._ws.once(`close`, (code, reason) => reject(new Error(`Socket closed with code ${code}: "${this._parsePayload(reason)}"`)));
            this._ws.once(`error`, (error) => reject(error));

            this._ws.once(`open`, () => {
                this._log(`Socket open`, {
                    level: `DEBUG`, system: this.system
                });

                this._ws!.removeAllListeners();
                this._ws!.on(`close`, this._wsOnClose.bind(this));
                this._ws!.on(`error`, this._wsOnError.bind(this));
                this._ws!.on(`message`, this._wsOnMessage.bind(this));

                if (this.options.resumeKeyConfig) {
                    this.send({
                        op: `configureResuming`,
                        key: this.options.resumeKeyConfig.key,
                        timeout: Math.round(this.options.resumeKeyConfig.timeout / 1000)
                    })
                        .then(() => {
                            this._enterState(NodeState.RUNNING);
                            resolve(true);
                        })
                        .catch((error) => reject(error));
                } else {
                    this._enterState(NodeState.RUNNING);
                    resolve(true);
                }
            });
        }).catch((error) => {
            if (this.state !== NodeState.DISCONNECTED && this.state !== NodeState.IDLE) {
                this._close(1000, `Failed to initialize node`);
                this._enterState(NodeState.DISCONNECTED);
            }
            return error;
        });
        if (result !== true) throw result;
    }


    /**
     * Parses an incoming payload.
     * @param data The data to parse.
     * @returns The parsed data.
     */
    private _parsePayload (data: RawData): any {
        try {
            if (Array.isArray(data)) data = Buffer.concat(data);
            else if (data instanceof ArrayBuffer) data = Buffer.from(data);
            return JSON.parse(data.toString());
        } catch (error: any) {
            if (typeof data === `string` || (typeof data.toString === `function` && typeof data.toString() === `string`)) return data;
            this._log(`Payload parsing error: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                level: `WARN`, system: this.system
            });
        }
    }

    /**
     * When the socket emits a close event.
     */
    private _wsOnClose (code: number, reason: Buffer): void {
        const parsedReason = this._parsePayload(reason);
        this._log(`Received close code ${code} with reason "${parsedReason}"`, {
            level: `WARN`, system: this.system
        });

        this._close(1000, parsedReason);
        this._enterState(NodeState.DISCONNECTED);

        if (this._spinning) return;

        this._log(`Reconnecting...`, {
            level: `INFO`, system: this.system
        });

        this.spawn()
            .then(() => this._log(`Reconnected`, {
                level: `INFO`, system: this.system
            }))
            .catch((error) => {
                this._log(`Error reconnecting: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                    level: `ERROR`, system: this.system
                });
            });
    }

    /**
     * When the socket emits an error event.
     */
    private _wsOnError (error: Error): void {
        this._log((error?.message ?? error) ?? `Unknown reason`, {
            level: `ERROR`, system: this.system
        });
    }

    /**
     * When the socket emits a message event.
     */
    private _wsOnMessage (data: RawData): void {
        const payload = this._parsePayload(data);

        this.emit(`RECEIVED_MESSAGE`, payload);

        switch (payload.op) {
            case `event`:
            case `playerUpdate`: {
                break;
            }
            case `stats`: {
                delete payload.op;
                this.stats = { ...payload };
                break;
            }
            default: {
                break;
            }
        }
    }
}
