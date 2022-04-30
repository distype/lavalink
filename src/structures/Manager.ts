import { Node, NodeOptions, NodeState } from './Node';
import { Player, PlayerOptions } from './Player';
import { Track, TrackData } from './Track';

import { LavalinkConstants } from '../utils/LavalnkConstants';

import { ExtendedMap, TypedEmitter } from '@br88c/node-utils';
import { Client, Snowflake } from 'distype';
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
export interface ManagerEvents extends Record<string, (...args: any[]) => void> {
    READY: () => void
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
 * The lavalink manager.
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
     * Create a lavalink manager.
     * @param client The manager's Distype client.
     * @param options The {@link ManagerOptions options} to use for the manager.
     */
    constructor (client: Client, options: ManagerOptions) {
        super();

        this.client = client;
        this.options = {
            clientName: options.clientName ?? `@distype/lavalink`,
            defaultSearchSource: options.defaultSearchSource ?? `yt`,
            nodeOptions: options.nodeOptions,
            leastLoadSort: options.leastLoadSort ?? `system`
        };

        options.nodeOptions.forEach((nodeOptions, i) => this.nodes.set(i, new Node(i, this, nodeOptions)));

        this.client.gateway.on(`VOICE_SERVER_UPDATE`, this._handleVoiceServerUpdate.bind(this));
        this.client.gateway.on(`VOICE_STATE_UPDATE`, this._handleVoiceStateUpdate.bind(this));
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
        const connect: Array<Promise<void>> = [];
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
    public createPlayer (guild: Snowflake, textChannel: Snowflake, voiceChannel: Snowflake, options?: PlayerOptions): Player {
        const existing = this.players.get(guild);
        if (existing) return existing;

        const node = this.availableNodes[0];
        if (!node) throw new Error(`No available nodes to bind the player to`);

        const player = new Player(this, node, guild, textChannel, voiceChannel, options);
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
    public async search (query: string, requester?: string, source?: ManagerSearchSource): Promise<ManagerSearchResult> {
        const searchNode = this.availableNodes[0];
        if (!searchNode) throw new Error(`No nodes are available to perform a search`);

        const res = await searchNode.request(`GET`, `/loadtracks`, { query: { identifier: LavalinkConstants.URL_REGEX.test(query) ? query : `${source ?? this.options.defaultSearchSource}search:${query}` } });

        if (!res) throw new Error(`No search response data`);

        const searchResult: ManagerSearchResult = {
            loadType: res.loadType,
            tracks: res.tracks.map((data: TrackData) => new Track(data, requester)),
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
        if (!decodeNode) throw new Error(`No nodes are available to decode tracks`);

        if (!tracks.length) throw new Error(`You must provide at least 1 track to decode`);
        else if (tracks.length === 1) {
            const res = await decodeNode.request(`GET`, `/decodetrack`, { query: { track: tracks[0] } });
            if (typeof res !== `object` || res === null) throw new Error(`No decode response data`);
            return [new Track(res)];
        } else {
            const res = await decodeNode.request(`POST`, `/decodetracks`, { body: tracks });
            if (!Array.isArray(res)) throw new Error(`No decode response data`);
            return res.map((data: TrackData) => new Track(data));
        }
    }

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

    private _handleVoiceStateUpdate (payload: GatewayVoiceStateUpdateDispatch): void {
        const player = this.players.get(payload.d.guild_id ?? ``);
        if (player && this.client.gateway.user?.id === payload.d.user_id) player.handleMove(payload.d);
    }
}
