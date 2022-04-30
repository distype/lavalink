"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
const Node_1 = require("./Node");
const Player_1 = require("./Player");
const Track_1 = require("./Track");
const LavalnkConstants_1 = require("../utils/LavalnkConstants");
const node_utils_1 = require("@br88c/node-utils");
/**
 * The lavalink manager.
 */
class Manager extends node_utils_1.TypedEmitter {
    /**
     * Create a lavalink manager.
     * @param client The manager's Distype client.
     * @param options The {@link ManagerOptions options} to use for the manager.
     */
    constructor(client, options) {
        super();
        /**
         * The manager's nodes.
         */
        this.nodes = new node_utils_1.ExtendedMap();
        /**
         * The manager's players.
         */
        this.players = new node_utils_1.ExtendedMap();
        this.client = client;
        this.options = {
            clientName: options.clientName ?? `@distype/lavalink`,
            defaultSearchSource: options.defaultSearchSource ?? `yt`,
            nodeOptions: options.nodeOptions,
            leastLoadSort: options.leastLoadSort ?? `system`
        };
        options.nodeOptions.forEach((nodeOptions, i) => this.nodes.set(i, new Node_1.Node(i, this, nodeOptions)));
        this.client.gateway.on(`VOICE_SERVER_UPDATE`, this._handleVoiceServerUpdate.bind(this));
        this.client.gateway.on(`VOICE_STATE_UPDATE`, this._handleVoiceStateUpdate.bind(this));
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
        const connect = [];
        this.nodes.forEach((node) => connect.push(node.spawn()));
        await Promise.allSettled(connect);
    }
    /**
     * Create a new player.
     * If a player for the specified guild already exists, it is returned and no new player is created.
     * @param guild The player's guild.
     * @param textChannel The player's text channel.
     * @param voiceChannel The player's voice channel.
     * @param options The player's options.
     * @returns The created player.
     */
    createPlayer(guild, textChannel, voiceChannel, options) {
        const existing = this.players.get(guild);
        if (existing)
            return existing;
        const node = this.availableNodes[0];
        if (!node)
            throw new Error(`No available nodes to bind the player to`);
        const player = new Player_1.Player(this, node, guild, textChannel, voiceChannel, options);
        this.players.set(guild, player);
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
            throw new Error(`No nodes are available to perform a search`);
        const res = await searchNode.request(`GET`, `/loadtracks`, { query: { identifier: LavalnkConstants_1.LavalinkConstants.URL_REGEX.test(query) ? query : `${source ?? this.options.defaultSearchSource}search:${query}` } });
        if (!res)
            throw new Error(`No search response data`);
        const searchResult = {
            loadType: res.loadType,
            tracks: res.tracks.map((data) => new Track_1.Track(data, requester)),
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
            throw new Error(`No nodes are available to decode tracks`);
        if (!tracks.length)
            throw new Error(`You must provide at least 1 track to decode`);
        else if (tracks.length === 1) {
            const res = await decodeNode.request(`GET`, `/decodetrack`, { query: { track: tracks[0] } });
            if (typeof res !== `object` || res === null)
                throw new Error(`No decode response data`);
            return [new Track_1.Track(res)];
        }
        else {
            const res = await decodeNode.request(`POST`, `/decodetracks`, { body: tracks });
            if (!Array.isArray(res))
                throw new Error(`No decode response data`);
            return res.map((data) => new Track_1.Track(data));
        }
    }
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
    _handleVoiceStateUpdate(payload) {
        const player = this.players.get(payload.d.guild_id ?? ``);
        if (player && this.client.gateway.user?.id === payload.d.user_id)
            player.handleMove(payload.d);
    }
}
exports.Manager = Manager;
