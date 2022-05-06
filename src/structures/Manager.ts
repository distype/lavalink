import { Node, NodeOptions, NodeState } from './Node';
import { Player, PlayerOptions, PlayerState } from './Player';
import { Track } from './Track';

import { DistypeLavalinkError, DistypeLavalinkErrorType } from '../errors/DistypeLavalinkError';
import { LogCallback } from '../types/Log';
import { LavalinkConstants } from '../utils/LavalinkConstants';

import { ExtendedMap, TypedEmitter } from '@br88c/node-utils';
import { Client, PermissionsUtils, Snowflake } from 'distype';
import { GatewayVoiceServerUpdateDispatch, GatewayVoiceStateUpdateDispatch } from 'discord-api-types/v10';

/**
 * The result from a search.
 */
export interface ManagerSearchResult {
    /**
     * The result's load type.
     */
    loadType: (typeof LavalinkConstants.LOAD_TYPES)[number]
    /**
     * The found tracks.
     */
    tracks: Track[]
    /**
     * Playlist info, if applicable.
     */
    playlistInfo?: {
        name: string
        selectedTrack: Track | null
    }
    /**
     * An exception, if applicable.
     */
    exception?: {
        message: string
        severity: string
    }
}

/**
 * A search source.
 */
export type ManagerSearchSource = (typeof LavalinkConstants.SOURCE_IDENTIFIERS)[number]

/**
 * {@link Manager} events.
 */
export type ManagerEvents = {
    /**
     * When all {@link Node nodes} are spawned and ready.
     */
    NODES_READY: (success: number, failed: number) => void
    /**
     * When a {@link Node node} receives a payload.
     */
    NODE_RECEIVED_MESSAGE: (payload: any) => void
    /**
     * When a payload is sent.
     */
    NODE_SENT_PAYLOAD: (payload: string) => void
    /**
     * When a {@link Node node} enters an {@link NodeState idle state}.
     */
    NODE_IDLE: (node: Node) => void
    /**
     * When a {@link Node node} enters a {@link NodeState connecting state}.
     */
    NODE_CONNECTING: (node: Node) => void
    /**
     * When a {@link Node node} enters a {@link NodeState running state}.
     */
    NODE_RUNNING: (node: Node) => void
    /**
     * When a {@link Node node} enters a {@link NodeState disconnected state}.
     */
    NODE_DISCONNECTED: (node: Node) => void
    /**
     * When a {@link Player player} connects to the first voice channel.
     */
    PLAYER_VOICE_CONNECTED: (player: Player, channel: Snowflake) => void
    /**
     * When a the bot is moved to a different voice channel.
     */
    PLAYER_VOICE_MOVED: (player: Player, newChannel: Snowflake) => void
    /**
     * When a {@link Player player} is destroyed.
     */
    PLAYER_DESTROYED: (player: Player, reason: string) => void
    /**
     * When a {@link Player player} is paused.
     */
    PLAYER_PAUSED: (player: Player) => void
    /**
     * When a {@link Player player} is resumed.
     */
    PLAYER_RESUMED: (player: Player) => void
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track end event.
     */
    PLAYER_TRACK_END: (player: Player, reason: string, track?: Track) => void
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track exception event.
     */
    PLAYER_TRACK_EXCEPTION: (player: Player, message: string, severity: string, cause: string, track?: Track) => void
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track start event.
     */
    PLAYER_TRACK_START: (player: Player, track?: Track) => void
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track stuck event.
     */
    PLAYER_TRACK_STUCK: (player: Player, thresholdMs: number, track?: Track) => void
    /**
     * When a {@link Player player}'s {@link Node node} receives a voice websocket close. Note that `4014` close codes are not emitted.
     */
    PLAYER_WEBSOCKET_CLOSED: (player: Player, code: number, reason: string, byRemote: boolean) => void
}

/**
 * {@link Manager} options.
 */
export interface ManagerOptions {
    /**
     * The client name to use.
     * @default `@distype/lavalink`
     */
    clientName?: string
    /**
     * The default searching source.
     * @default `yt`
     */
    defaultSearchSource?: ManagerSearchSource
    /**
     * An array of nodes to connect to.
     */
    nodeOptions: NodeOptions[]
    /**
     * The type of CPU load to sort by when getting the least load node.
     * @default `system`
     */
    leastLoadSort?: `system` | `lavalink`
}

/**
 * The Lavalink manager.
 */
export class Manager extends TypedEmitter<ManagerEvents> {
    /**
     * The client used by the manager.
     */
    public client: Client;
    /**
     * The manager's nodes.
     */
    public nodes: ExtendedMap<number, Node> = new ExtendedMap();
    /**
     * The manager's players.
     */
    public players: ExtendedMap<Snowflake, Player> = new ExtendedMap();

    /**
     * {@link ManagerOptions Options} for the manager.
     */
    public readonly options: Required<ManagerOptions>;
    /**
     * The system string used for emitting errors and for the {@link LogCallback log callback}.
     */
    public readonly system = `Lavalink Manager`;

    /**
     * The {@link LogCallback log callback} used by the node.
     */
    private _log: LogCallback;
    /**
     * A value to use as `this` in the `this#_log`.
     */
    private _logThisArg?: any;

    /**
     * Create a lavalink manager.
     * @param client The manager's Distype client.
     * @param options The {@link ManagerOptions options} to use for the manager.
     */
    constructor (client: Client, options: ManagerOptions, logCallback: LogCallback = (): void => {}, logThisArg?: any) {
        super();

        this.client = client;
        this.options = {
            clientName: options.clientName ?? `@distype/lavalink`,
            defaultSearchSource: options.defaultSearchSource ?? `yt`,
            nodeOptions: options.nodeOptions,
            leastLoadSort: options.leastLoadSort ?? `system`
        };

        options.nodeOptions.forEach((nodeOptions, i) => {
            const node = new Node(i, this, nodeOptions, logCallback, logThisArg);
            this.nodes.set(i, node);

            node.on(`RECEIVED_MESSAGE`, (payload) => {
                this.emit(`NODE_RECEIVED_MESSAGE`, payload);

                const player = this.players.get(payload.guildId);
                if (player) player.handlePayload(payload);
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
    public get availableNodes (): Node[] {
        return this.nodes
            .reduce((p, v) => p.concat(v), [] as Node[])
            .filter((node) => node.state === NodeState.RUNNING)
            .sort((a, b) => (a.stats.cpu ? a.stats.cpu[this.options.leastLoadSort === `system` ? `systemLoad` : `lavalinkLoad`] / a.stats.cpu.cores : 0) - (b.stats.cpu ? b.stats.cpu[this.options.leastLoadSort === `system` ? `systemLoad` : `lavalinkLoad`] / b.stats.cpu.cores : 0));
    }

    /**
     * Spawn all nodes.
     * @returns The results of node connection attempts.
     */
    public async spawnNodes (): Promise<void> {
        this._log(`Spawning ${this.nodes.size} nodes`, {
            level: `INFO`, system: this.system
        });

        const connect: Array<Promise<void>> = [];
        this.nodes.forEach((node) => connect.push(node.spawn()));
        const results = await Promise.allSettled(connect);

        const success = results.filter((result) => result.status === `fulfilled`).length;
        const failed = this.nodes.size - success;

        this._log(`${success}/${success + failed} nodes spawned`, {
            level: `INFO`, system: this.system
        });
        if (failed > 0) this._log(`${failed} nodes failed to spawn`, {
            level: `WARN`, system: this.system
        });

        this.emit(`NODES_READY`, success, failed);
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
    public async preparePlayer (guild: Snowflake, textChannel: Snowflake, voiceChannel: Snowflake, options?: PlayerOptions): Promise<Player> {
        const existing = this.players.get(guild);
        if (existing) {
            await existing.connect().finally(() => {
                if (player.state === PlayerState.DISCONNECTED) player.destroy();
            });

            return existing;
        }

        const node = this.availableNodes[0];
        if (!node) throw new DistypeLavalinkError(`No available nodes to bind the player to`, DistypeLavalinkErrorType.MANAGER_NO_NODES_AVAILABLE, this.system);

        const permissions = await this.client.getSelfPermissions(guild, textChannel);
        if (!LavalinkConstants.REQUIRED_PERMISSIONS.TEXT.every((perm) => PermissionsUtils.hasPerm(permissions, perm))) {
            throw new DistypeLavalinkError(`Missing one of the following permissions in the text channel: ${LavalinkConstants.REQUIRED_PERMISSIONS.TEXT.join(`, `)}`, DistypeLavalinkErrorType.PLAYER_MISSING_PERMISSIONS, `Lavalink Player ${guild}`);
        }

        const player = new Player(this, node, guild, textChannel, voiceChannel, options, this._log, this._logThisArg);
        this.players.set(guild, player);

        await player.connect().finally(() => {
            if (player.state === PlayerState.DISCONNECTED) player.destroy();
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
    public async search (query: string, requester?: string, source?: ManagerSearchSource): Promise<ManagerSearchResult> {
        const searchNode = this.availableNodes[0];
        if (!searchNode) throw new DistypeLavalinkError(`No nodes are available to perform a search`, DistypeLavalinkErrorType.MANAGER_NO_NODES_AVAILABLE, this.system);

        const res = await searchNode.request(`GET`, `/loadtracks`, { query: { identifier: /^https?:\/\//.test(query) ? query : `${source ?? this.options.defaultSearchSource}search:${query}` } });

        if (!res) throw new DistypeLavalinkError(`No search response data`, DistypeLavalinkErrorType.MANAGER_NO_RESPONSE_DATA, this.system);

        const searchResult: ManagerSearchResult = {
            loadType: res.loadType,
            tracks: res.tracks.map((data: any) => new Track({
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
    public async decodeTracks (...tracks: string[]): Promise<Track[]> {
        const decodeNode = this.availableNodes[0];
        if (!decodeNode) throw new DistypeLavalinkError(`No nodes are available to decode tracks`, DistypeLavalinkErrorType.MANAGER_NO_NODES_AVAILABLE, this.system);

        if (!tracks.length) throw new TypeError(`You must provide at least 1 track to decode`);
        else if (tracks.length === 1) {
            const res = await decodeNode.request(`GET`, `/decodetrack`, { query: { track: tracks[0] } });
            if (typeof res !== `object` || res === null) throw new DistypeLavalinkError(`No decode response data`, DistypeLavalinkErrorType.MANAGER_NO_RESPONSE_DATA, this.system);
            return [
                new Track({
                    track: tracks[0],
                    ...res
                })
            ];
        } else {
            const res = await decodeNode.request(`POST`, `/decodetracks`, { body: tracks });
            if (!Array.isArray(res)) throw new DistypeLavalinkError(`No decode response data`, DistypeLavalinkErrorType.MANAGER_NO_RESPONSE_DATA, this.system);
            return res.map((data) => new Track({
                track: data.track,
                ...data.info
            }));
        }
    }

    /**
     * Handle incoming voice server update payloads.
     * @param payload The payload.
     */
    private _handleVoiceServerUpdate (payload: GatewayVoiceServerUpdateDispatch): void {
        const player = this.players.get(payload.d.guild_id);
        if (!player) return;

        const shard = this.client.gateway.guildShard(player.guild);
        if (typeof shard === `number`) return;

        player.node.send({
            op: `voiceUpdate`,
            guildId: payload.d.guild_id,
            sessionId: shard.sessionId,
            event: payload.d
        }).catch(() => {});
    }

    /**
     * Handle incoming voice state updates.
     * @param payload The payload.
     */
    private _handleVoiceStateUpdate (payload: GatewayVoiceStateUpdateDispatch): void {
        const player = this.players.get(payload.d.guild_id ?? ``);
        if (player && this.client.gateway.user?.id === payload.d.user_id) player.handleMove(payload.d);
    }
}
