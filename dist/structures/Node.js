"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.NodeState = void 0;
const LavalinkManager_1 = require("./LavalinkManager");
const node_utils_1 = require("@br88c/node-utils");
const undici_1 = require("undici");
const url_1 = require("url");
const ws_1 = require("ws");
/**
 * A {@link Node node}'s state.
 */
var NodeState;
(function (NodeState) {
    NodeState[NodeState["DISCONNECTED"] = 0] = "DISCONNECTED";
    NodeState[NodeState["CONNECTING"] = 1] = "CONNECTING";
    NodeState[NodeState["RECONNECTING"] = 2] = "RECONNECTING";
    NodeState[NodeState["CONNECTED"] = 3] = "CONNECTED";
    NodeState[NodeState["DESTROYED"] = 4] = "DESTROYED";
})(NodeState = exports.NodeState || (exports.NodeState = {}));
/**
 * A lavalink node.
 * Communicates with a lavalink server.
 */
class Node extends node_utils_1.TypedEmitter {
    /**
     * Create a node.
     * @param id The node's ID.
     * @param manager The node's {@link LavalinkManager manager}.
     * @param options The {@link NodeOptions options} to use for the node.
     */
    constructor(id, manager, options = {}) {
        super();
        /**
         * The node's {@link NodeState state}.
         */
        this.state = NodeState.DISCONNECTED;
        /**
         * The {@link NodeStats node's stats}.
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
         * Incremented when reconnecting to compare to Node#options#maxRetrys.
         */
        this._reconnectAttempts = 0;
        /**
         * Used for delaying reconnection attempts.
         */
        this._reconnectTimeout = null;
        /**
         * The node's websocket.
         */
        this._ws = null;
        if (typeof id !== `number`)
            throw new TypeError(`A node ID must be specified`);
        if (!(manager instanceof LavalinkManager_1.LavalinkManager))
            throw new TypeError(`A manager must be specified`);
        this.id = id;
        this.manager = manager;
        this.options = {
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
        };
        if (this.options.connectionTimeout > this.options.retryDelay)
            throw new Error(`Node connection timeout must be greater than the reconnect retry delay`);
        this.on(`CONNECTED`, (...data) => this.manager.emit(`NODE_CONNECTED`, ...data));
        this.on(`CREATED`, (...data) => this.manager.emit(`NODE_CREATED`, ...data));
        this.on(`DESTROYED`, (...data) => this.manager.emit(`NODE_DESTROYED`, ...data));
        this.on(`DISCONNECTED`, (...data) => this.manager.emit(`NODE_DISCONNECTED`, ...data));
        this.on(`ERROR`, (...data) => this.manager.emit(`NODE_ERROR`, ...data));
        this.on(`RAW`, (...data) => this.manager.emit(`NODE_RAW`, ...data));
        this.on(`RECONNECTING`, (...data) => this.manager.emit(`NODE_RECONNECTING`, ...data));
        this.emit(`CREATED`, this);
    }
    /**
     * Connect the node to the lavalink server.
     */
    async connect() {
        if (this.state !== NodeState.DISCONNECTED && this.state !== NodeState.RECONNECTING)
            throw new Error(`Cannot initiate a connection when the node isn't in a disconnected or reconnecting state`);
        const headers = {
            'Authorization': this.options.password,
            'User-Id': this.manager.client.gateway.user?.id,
            'Client-Name': this.options.clientName
        };
        if (this.options.resumeKey)
            headers[`Resume-Key`] = this.options.resumeKey;
        return await new Promise((resolve, reject) => {
            const timedOut = setTimeout(() => {
                const error = new Error(`Timed out while connecting to the lavalink server`);
                this.emit(`ERROR`, this, error);
                reject(error);
            }, this.options.connectionTimeout);
            this._ws = new ws_1.WebSocket(`ws${this.options.secure ? `s` : ``}://${this.options.host}:${this.options.port}/`, { headers });
            if (this.state !== NodeState.RECONNECTING)
                this.state = NodeState.CONNECTING;
            this._ws.once(`error`, (error) => {
                this._ws.removeAllListeners();
                this._ws = null;
                if (this.state !== NodeState.RECONNECTING)
                    this.state = NodeState.DISCONNECTED;
                this._onError(error);
                if (timedOut)
                    clearTimeout(timedOut);
                reject(error);
            });
            this._ws.once(`open`, async () => {
                this._ws.removeAllListeners();
                this._onOpen();
                this._ws.on(`open`, this._onOpen.bind(this));
                this._ws.on(`close`, this._onClose.bind(this));
                this._ws.on(`error`, this._onError.bind(this));
                this._ws.on(`message`, this._onMessage.bind(this));
                if (timedOut)
                    clearTimeout(timedOut);
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
    destroy(reason = `Manual destroy`) {
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
        this.emit(`DESTROYED`, this, reason);
        this.removeAllListeners();
        this.manager.nodes.delete(this.id);
    }
    /**
     * Send data to the lavalink server.
     * @param msg The data to send.
     */
    async send(msg) {
        if (this.state !== NodeState.CONNECTED)
            throw new Error(`Cannot send payloads before a connection is established`);
        return await new Promise((resolve, reject) => {
            this._ws?.send(JSON.stringify(msg), (error) => {
                if (error) {
                    this.emit(`ERROR`, this, error);
                    reject(error);
                }
                else
                    resolve(true);
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
    async request(method, route, options = {}) {
        const headers = {
            ...this.options.defaultRequestOptions.headers,
            ...options.headers,
            'Authorization': this.options.password
        };
        if (options.body)
            headers[`Content-Type`] = `application/json`;
        const res = await (0, undici_1.request)(`http${this.options.secure ? `s` : ``}://${this.options.host}:${this.options.port}/${route.replace(/^\//gm, ``)}${options.query ? `?${new url_1.URLSearchParams(options.query).toString()}` : ``}`, {
            ...this.options.defaultRequestOptions,
            ...options,
            method,
            headers,
            body: JSON.stringify(options.body),
            bodyTimeout: options.timeout ?? this.options.defaultRequestOptions.timeout
        });
        return res.statusCode === 204 ? null : await res.body.json().catch(() => null);
    }
    /**
     * Attempt to reconnect the node to the server.
     */
    _reconnect() {
        this.state = NodeState.RECONNECTING;
        this._reconnectTimeout = setInterval(() => {
            if (this.options.maxRetrys !== 0 && this._reconnectAttempts >= this.options.maxRetrys) {
                this.emit(`ERROR`, this, new Error(`Unable to reconnect after ${this._reconnectAttempts} attempts.`));
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
    _onOpen() {
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
    _onClose(code, reason) {
        this.state = NodeState.DISCONNECTED;
        this.emit(`DISCONNECTED`, this, code, reason.length ? reason : `No reason specified`);
        if (code !== 1000 && reason !== `destroy`)
            this._reconnect();
    }
    /**
     * Fired when the websocket emits an error event.
     * @param error The error thrown.
     */
    _onError(error) {
        if (!error)
            return;
        this.emit(`ERROR`, this, error);
    }
    /**
     * Fired when the websocket receives a message payload
     * @param data The received data.
     */
    _onMessage(data) {
        if (Array.isArray(data))
            data = Buffer.concat(data);
        else if (data instanceof ArrayBuffer)
            data = Buffer.from(data);
        const payload = JSON.parse(data.toString());
        this.emit(`RAW`, this, payload);
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
                this.emit(`ERROR`, this, new Error(`Received unexpected op "${payload.op}"`));
                break;
            }
        }
    }
}
exports.Node = Node;
