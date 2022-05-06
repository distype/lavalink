"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.NodeState = void 0;
const DistypeLavalinkError_1 = require("../errors/DistypeLavalinkError");
const node_utils_1 = require("@br88c/node-utils");
const undici_1 = require("undici");
const ws_1 = require("ws");
/**
 * {@link Node} states.
 */
var NodeState;
(function (NodeState) {
    NodeState[NodeState["IDLE"] = 0] = "IDLE";
    NodeState[NodeState["CONNECTING"] = 1] = "CONNECTING";
    NodeState[NodeState["RUNNING"] = 2] = "RUNNING";
    NodeState[NodeState["DISCONNECTED"] = 3] = "DISCONNECTED";
})(NodeState = exports.NodeState || (exports.NodeState = {}));
/**
 * A Lavalink node.
 */
class Node extends node_utils_1.TypedEmitter {
    /**
     * Create a Lavalink node.
     * @param id The node's ID.
     * @param manager The node's {@link Manager manager}.
     * @param options The node's {@link NodeOptions options}.
     * @param logCallback A {@link LogCallback callback} to be used for logging events internally in the node.
     * @param logThisArg A value to use as `this` in the `logCallback`.
     */
    constructor(id, manager, options, logCallback = () => { }, logThisArg) {
        super();
        /**
         * The node's {@link NodeState state.}
         */
        this.state = NodeState.IDLE;
        /**
         * The node's {@link NodeStats stats}.
         */
        this.stats = {
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
         * If the node was killed. Set back to `false` when a new connection attempt is started.
         */
        this._killed = false;
        /**
         * If the node has an active spawn loop.
         */
        this._spinning = false;
        /**
         * The websocket used.
         */
        this._ws = null;
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
    async spawn() {
        if (this._spinning)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`Node is already connecting`, DistypeLavalinkError_1.DistypeLavalinkErrorType.NODE_ALREADY_CONNECTING, this.system);
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
                throw new DistypeLavalinkError_1.DistypeLavalinkError(`Node spawn attempts interrupted by kill`, DistypeLavalinkError_1.DistypeLavalinkErrorType.NODE_INTERRUPT_FROM_KILL, this.system);
            }
            if (i < this.options.spawnMaxAttempts - 1) {
                await (0, node_utils_1.wait)(this.options.spawnAttemptDelay);
            }
        }
        this._spinning = false;
        this._enterState(NodeState.IDLE);
        throw new DistypeLavalinkError_1.DistypeLavalinkError(`Failed to spawn node after ${this.options.spawnMaxAttempts} attempts`, DistypeLavalinkError_1.DistypeLavalinkErrorType.NODE_MAX_SPAWN_ATTEMPTS_REACHED, this.system);
    }
    /**
     * Kill the node.
     * @param code A socket [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code). Defaults to `1000`.
     * @param reason The reason the node is being killed. Defaults to `"Manual kill"`.
     */
    kill(code = 1000, reason = `Manual kill`) {
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
    async send(data) {
        const payload = JSON.stringify(data);
        return await new Promise((resolve, reject) => {
            if (!this._ws || this._ws.readyState !== ws_1.WebSocket.OPEN) {
                reject(new DistypeLavalinkError_1.DistypeLavalinkError(`Cannot send data when the socket is not in an OPEN state`, DistypeLavalinkError_1.DistypeLavalinkErrorType.NODE_SEND_WITHOUT_OPEN_SOCKET, this.system));
            }
            else {
                this._ws.send(payload, (error) => {
                    if (error)
                        reject(error);
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
    async request(method, route, options = {}) {
        const headers = {
            ...this.options.defaultRequestOptions.headers,
            ...options.headers,
            'Authorization': this.options.password
        };
        if (options.body)
            headers[`Content-Type`] = `application/json`;
        const url = new URL(`http${this.options.location.secure ? `s` : ``}://${this.options.location.host}:${this.options.location.port}${route}`);
        url.search = new URLSearchParams(options.query).toString();
        const req = (0, undici_1.request)(url, {
            ...this.options.defaultRequestOptions,
            ...options,
            method,
            headers,
            body: JSON.stringify(options.body),
            bodyTimeout: options.timeout ?? this.options.defaultRequestOptions.timeout
        });
        let unableToParse = false;
        const res = await req.then(async (r) => ({
            ...r,
            body: r.statusCode !== 204 ? await r.body?.json().catch((error) => {
                unableToParse = (error?.message ?? error) ?? `Unknown reason`;
            }) : undefined
        }));
        if (typeof unableToParse === `string`)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`Unable to parse response body: "${unableToParse}"`, DistypeLavalinkError_1.DistypeLavalinkErrorType.NODE_REST_UNABLE_TO_PARSE_RESPONSE_BODY, this.system);
        if (res.statusCode >= 400)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`REST status code ${res.statusCode}`, DistypeLavalinkError_1.DistypeLavalinkErrorType.NODE_REST_REQUEST_ERROR, this.system);
        return res.body;
    }
    /**
     * Closes the connection, and cleans up helper variables.
     * @param code A socket [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code).
     * @param reason The reason the node is being closed.
     */
    _close(code, reason) {
        this._log(`Closing... (Code ${code}, reason "${reason}")`, {
            level: `DEBUG`, system: this.system
        });
        this._ws?.removeAllListeners();
        if (this._ws?.readyState !== ws_1.WebSocket.CLOSED) {
            try {
                this._ws?.close(code, reason);
            }
            catch {
                this._ws?.terminate();
            }
        }
        this._ws = null;
    }
    /**
     * Enter a state.
     * @param state The state to enter.
     */
    _enterState(state) {
        if (this.state !== state) {
            this.state = state;
            this._log(NodeState[state], {
                level: `DEBUG`, system: this.system
            });
            this.emit(NodeState[state]);
        }
    }
    /**
     * Initiate the socket.
     */
    async _initSocket() {
        if (!this.manager.client.gateway.user)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`Gateway user is not defined`, DistypeLavalinkError_1.DistypeLavalinkErrorType.DISTYPE_GATEWAY_USER_UNDEFINED, this.system);
        if (this.state !== NodeState.IDLE && this.state !== NodeState.DISCONNECTED) {
            this._close(1000, `Restarting`);
            this._enterState(NodeState.DISCONNECTED);
        }
        this._log(`Initiating socket...`, {
            level: `DEBUG`, system: this.system
        });
        this._enterState(NodeState.CONNECTING);
        const result = await new Promise((resolve, reject) => {
            const headers = {
                'Authorization': this.options.password,
                'User-Id': this.manager.client.gateway.user.id,
                'Client-Name': this.manager.options.clientName
            };
            if (this.options.resumeKeyConfig?.key)
                headers[`Resume-Key`] = this.options.resumeKeyConfig.key;
            this._ws = new ws_1.WebSocket(`ws${this.options.location.secure ? `s` : ``}://${this.options.location.host}:${this.options.location.port}/`, { headers });
            this._ws.once(`close`, (code, reason) => reject(new DistypeLavalinkError_1.DistypeLavalinkError(`Socket closed with code ${code}: "${this._parsePayload(reason)}"`, DistypeLavalinkError_1.DistypeLavalinkErrorType.NODE_CLOSED_DURING_SOCKET_INIT, this.system)));
            this._ws.once(`error`, (error) => reject(error));
            this._ws.once(`open`, () => {
                this._log(`Socket open`, {
                    level: `DEBUG`, system: this.system
                });
                this._ws.removeAllListeners();
                this._ws.on(`close`, this._wsOnClose.bind(this));
                this._ws.on(`error`, this._wsOnError.bind(this));
                this._ws.on(`message`, this._wsOnMessage.bind(this));
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
                }
                else {
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
        if (result !== true)
            throw result;
    }
    /**
     * Parses an incoming payload.
     * @param data The data to parse.
     * @returns The parsed data.
     */
    _parsePayload(data) {
        try {
            if (Array.isArray(data))
                data = Buffer.concat(data);
            else if (data instanceof ArrayBuffer)
                data = Buffer.from(data);
            return JSON.parse(data.toString());
        }
        catch (error) {
            if (typeof data === `string` || (typeof data.toString === `function` && typeof data.toString() === `string`))
                return data;
            this._log(`Payload parsing error: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                level: `WARN`, system: this.system
            });
        }
    }
    /**
     * When the socket emits a close event.
     */
    _wsOnClose(code, reason) {
        const parsedReason = this._parsePayload(reason);
        this._log(`Received close code ${code} with reason "${parsedReason}"`, {
            level: `WARN`, system: this.system
        });
        this._close(1000, parsedReason);
        this._enterState(NodeState.DISCONNECTED);
        if (this._spinning)
            return;
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
    _wsOnError(error) {
        this._log((error?.message ?? error) ?? `Unknown reason`, {
            level: `ERROR`, system: this.system
        });
    }
    /**
     * When the socket emits a message event.
     */
    _wsOnMessage(data) {
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
exports.Node = Node;