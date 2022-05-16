"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
const Node_1 = require("./Node");
const Player_1 = require("./Player");
const Track_1 = require("./Track");
const DistypeLavalinkError_1 = require("../errors/DistypeLavalinkError");
const LavalinkConstants_1 = require("../utils/LavalinkConstants");
const node_utils_1 = require("@br88c/node-utils");
const distype_1 = require("distype");
/**
 * The Lavalink manager.
 */
class Manager extends node_utils_1.TypedEmitter {
    /**
     * Create a lavalink manager.
     * @param client The manager's Distype client.
     * @param options The {@link ManagerOptions options} to use for the manager.
     */
    constructor(client, options, logCallback = () => { }, logThisArg) {
        super();
        /**
         * The manager's nodes.
         */
        this.nodes = new node_utils_1.ExtendedMap();
        /**
         * The manager's players.
         */
        this.players = new node_utils_1.ExtendedMap();
        /**
         * The system string used for emitting errors and for the {@link LogCallback log callback}.
         */
        this.system = `Lavalink Manager`;
        this.client = client;
        this.options = {
            clientName: options.clientName ?? `@distype/lavalink`,
            defaultSearchSource: options.defaultSearchSource ?? `yt`,
            nodeOptions: options.nodeOptions,
            leastLoadSort: options.leastLoadSort ?? `system`
        };
        options.nodeOptions.forEach((nodeOptions, i) => {
            const node = new Node_1.Node(i, this, nodeOptions, logCallback, logThisArg);
            this.nodes.set(i, node);
            node.on(`RECEIVED_MESSAGE`, (payload) => {
                this.emit(`NODE_RECEIVED_MESSAGE`, payload);
                const player = this.players.get(payload.guildId);
                if (player)
                    player.handlePayload(payload);
            });
            node.on(`SENT_PAYLOAD`, (payload) => this.emit(`NODE_SENT_PAYLOAD`, payload));
            node.on(`IDLE`, () => this.emit(`NODE_IDLE`, node));
            node.on(`CONNECTING`, () => this.emit(`NODE_CONNECTING`, node));
            node.on(`RUNNING`, () => this.emit(`NODE_RUNNING`, node));
            node.on(`DISCONNECTED`, () => this.emit(`NODE_DISCONNECTED`, node));
        });
        this.client.gateway.on(`VOICE_SERVER_UPDATE`, this._handleVoiceServerUpdate.bind(this));
        this.client.gateway.on(`VOICE_STATE_UPDATE`, this._handleVoiceStateUpdate.bind(this));
        this._log = logCallback.bind(logThisArg);
        this._logThisArg = logThisArg;
        this._log(`Initialized manager`, {
            level: `DEBUG`, system: this.system
        });
    }
    /**
     * Available nodes sorted by cpu load.
     */
    get availableNodes() {
        return this.nodes
            .reduce((p, v) => p.concat(v), [])
            .filter((node) => node.state === Node_1.NodeState.RUNNING)
            .sort((a, b) => (a.stats.cpu ? a.stats.cpu[this.options.leastLoadSort === `system` ? `systemLoad` : `lavalinkLoad`] / a.stats.cpu.cores : 0) - (b.stats.cpu ? b.stats.cpu[this.options.leastLoadSort === `system` ? `systemLoad` : `lavalinkLoad`] / b.stats.cpu.cores : 0));
    }
    /**
     * Spawn all nodes.
     * @returns The results of node connection attempts.
     */
    async spawnNodes() {
        this._log(`Spawning ${this.nodes.size} nodes`, {
            level: `INFO`, system: this.system
        });
        const connect = [];
        this.nodes.forEach((node) => connect.push(node.spawn()));
        const results = await Promise.allSettled(connect);
        const success = results.filter((result) => result.status === `fulfilled`).length;
        const failed = this.nodes.size - success;
        this._log(`${success}/${success + failed} nodes spawned`, {
            level: `INFO`, system: this.system
        });
        if (failed > 0)
            this._log(`${failed} nodes failed to spawn`, {
                level: `WARN`, system: this.system
            });
        this.emit(`NODES_READY`, success, failed);
    }
    /**
     * Gets the average ping across all nodes.
     * @returns The average ping in milliseconds.
     */
    async averagePing() {
        let totalPing = 0;
        for (const node of this.nodes.values()) {
            totalPing += await node.getPing();
        }
        return totalPing / this.nodes.size;
    }
    /**
     * Creates a new player and connects it to the voice channel. Also checks channel permissions.
     * The player is not permanently saved or bound to the manager if it fails to connect or doesn't have sufficient permissions.
     * If a player for the specified guild already exists, it is returned and no new player is created. If it is disconnected, it is automatically connected.
     * @param guild The player's guild.
     * @param textChannel The player's text channel.
     * @param voiceChannel The player's voice channel.
     * @param options The player's options.
     * @returns The created player.
     */
    async preparePlayer(guild, textChannel, voiceChannel, options) {
        const existing = this.players.get(guild);
        if (existing) {
            await existing.connect().finally(() => {
                if (player.state === Player_1.PlayerState.DISCONNECTED)
                    player.destroy();
            });
            return existing;
        }
        const node = this.availableNodes[0];
        if (!node)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`No available nodes to bind the player to`, DistypeLavalinkError_1.DistypeLavalinkErrorType.MANAGER_NO_NODES_AVAILABLE, this.system);
        const permissions = await this.client.getSelfPermissions(guild, textChannel);
        if (!distype_1.PermissionsUtils.hasPerms(permissions, ...LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.TEXT)) {
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`Missing one of the following permissions in the text channel: ${LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.TEXT.join(`, `)}`, DistypeLavalinkError_1.DistypeLavalinkErrorType.PLAYER_MISSING_PERMISSIONS, `Lavalink Player ${guild}`);
        }
        const player = new Player_1.Player(this, node, guild, textChannel, voiceChannel, options, this._log, this._logThisArg);
        this.players.set(guild, player);
        await player.connect().finally(() => {
            if (player.state === Player_1.PlayerState.DISCONNECTED)
                player.destroy();
        });
        player.on(`VOICE_CONNECTED`, (channel) => this.emit(`PLAYER_VOICE_CONNECTED`, player, channel));
        player.on(`VOICE_MOVED`, (newChannel) => this.emit(`PLAYER_VOICE_MOVED`, player, newChannel));
        player.on(`DESTROYED`, (reason) => this.emit(`PLAYER_DESTROYED`, player, reason));
        player.on(`PAUSED`, () => this.emit(`PLAYER_PAUSED`, player));
        player.on(`RESUMED`, () => this.emit(`PLAYER_RESUMED`, player));
        player.on(`TRACK_END`, (reason, track) => this.emit(`PLAYER_TRACK_END`, player, reason, track));
        player.on(`TRACK_EXCEPTION`, (message, severity, cause, track) => this.emit(`PLAYER_TRACK_EXCEPTION`, player, message, severity, cause, track));
        player.on(`TRACK_START`, (track) => this.emit(`PLAYER_TRACK_START`, player, track));
        player.on(`TRACK_STUCK`, (thresholdMs, track) => this.emit(`PLAYER_TRACK_STUCK`, player, thresholdMs, track));
        player.on(`WEBSOCKET_CLOSED`, (code, reason, byRemote) => this.emit(`PLAYER_WEBSOCKET_CLOSED`, player, code, reason, byRemote));
        return player;
    }
    /**
     * Get search results based on a query.
     * If the query is a link, it will attempt to get a track from the link. If not, it will return results from a search using the specified or default source.
     * @param query The query to search with.
     * @param requester The user that requested the track. This value can be anything, and solely exists for your convenience.
     * @param source The source to use if the query is not a link. Defaults to the manager's default source.
     * @returns The search result.
     */
    async search(query, requester, source) {
        const searchNode = this.availableNodes[0];
        if (!searchNode)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`No nodes are available to perform a search`, DistypeLavalinkError_1.DistypeLavalinkErrorType.MANAGER_NO_NODES_AVAILABLE, this.system);
        const res = await searchNode.request(`GET`, `/loadtracks`, { query: { identifier: /^https?:\/\//.test(query) ? query : `${source ?? this.options.defaultSearchSource}search:${query}` } });
        if (!res)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`No search response data`, DistypeLavalinkError_1.DistypeLavalinkErrorType.MANAGER_NO_RESPONSE_DATA, this.system);
        const searchResult = {
            loadType: res.loadType,
            tracks: res.tracks.map((data) => new Track_1.Track({
                track: data.track,
                ...data.info
            }, requester)),
            exception: res.exception
        };
        if (res.playlistInfo) {
            searchResult.playlistInfo = {
                name: res.playlistInfo.Name,
                selectedTrack: typeof res.playlistInfo.selectedTrack === `number` ? searchResult.tracks[res.playlistInfo.selectedTrack] : null
            };
        }
        return searchResult;
    }
    /**
     * Decode track strings into an array of tracks.
     * @param tracks The tracks encoded in base64.
     * @returns An array of the decoded tracks.
     */
    async decodeTracks(...tracks) {
        const decodeNode = this.availableNodes[0];
        if (!decodeNode)
            throw new DistypeLavalinkError_1.DistypeLavalinkError(`No nodes are available to decode tracks`, DistypeLavalinkError_1.DistypeLavalinkErrorType.MANAGER_NO_NODES_AVAILABLE, this.system);
        if (!tracks.length)
            throw new TypeError(`You must provide at least 1 track to decode`);
        else if (tracks.length === 1) {
            const res = await decodeNode.request(`GET`, `/decodetrack`, { query: { track: tracks[0] } });
            if (typeof res !== `object` || res === null)
                throw new DistypeLavalinkError_1.DistypeLavalinkError(`No decode response data`, DistypeLavalinkError_1.DistypeLavalinkErrorType.MANAGER_NO_RESPONSE_DATA, this.system);
            return [
                new Track_1.Track({
                    track: tracks[0],
                    ...res
                })
            ];
        }
        else {
            const res = await decodeNode.request(`POST`, `/decodetracks`, { body: tracks });
            if (!Array.isArray(res))
                throw new DistypeLavalinkError_1.DistypeLavalinkError(`No decode response data`, DistypeLavalinkError_1.DistypeLavalinkErrorType.MANAGER_NO_RESPONSE_DATA, this.system);
            return res.map((data) => new Track_1.Track({
                track: data.track,
                ...data.info
            }));
        }
    }
    /**
     * Handle incoming voice server update payloads.
     * @param payload The payload.
     */
    _handleVoiceServerUpdate(payload) {
        const player = this.players.get(payload.d.guild_id);
        if (!player)
            return;
        const shard = this.client.gateway.guildShard(player.guild);
        if (typeof shard === `number`)
            return;
        player.node.send({
            op: `voiceUpdate`,
            guildId: payload.d.guild_id,
            sessionId: shard.sessionId,
            event: payload.d
        }).catch(() => { });
    }
    /**
     * Handle incoming voice state updates.
     * @param payload The payload.
     */
    _handleVoiceStateUpdate(payload) {
        const player = this.players.get(payload.d.guild_id ?? ``);
        if (player && this.client.gateway.user?.id === payload.d.user_id)
            player.handleMove(payload.d);
    }
}
exports.Manager = Manager;
