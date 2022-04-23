import { Node, NodeOptions, NodeState } from './Node';
import { Player, PlayerOptions } from './Player';
import { Track, TrackData, TrackPartial } from './Track';

import { LavalinkConstants } from '../utils/LavalnkConstants';

import { ExtendedMap, TypedEmitter } from '@br88c/node-utils';
import { Client, Snowflake } from 'distype';

/**
 * The result from a search.
 */
export interface ManagerSearchResult {
    /**
     * The result's load type.
     */
    loadType: `TRACK_LOADED` | `PLAYLIST_LOADED` | `SEARCH_RESULT` | `NO_MATCHES` | `LOAD_FAILED`
    /**
     * The found tracks.
     */
    tracks: Array<Track | TrackPartial>
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
export type ManagerSearchSource = `youtube` | `soundcloud`

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
     * @default `youtube`
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
            defaultSearchSource: options.defaultSearchSource ?? `youtube`,
            nodeOptions: options.nodeOptions,
            leastLoadSort: options.leastLoadSort ?? `system`
        };

        options.nodeOptions.forEach((nodeOptions, i) => this.nodes.set(i, new Node(i, this, nodeOptions)));
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
     * @param options The player's options.
     * @returns The created player.
     */
    public createPlayer (options: PlayerOptions): Player {
        if (this.players.get(options.guildId)) throw new Error(`A player already exists for that guild`);

        const node = this.availableNodes[0];
        if (!node) throw new Error(`No available nodes to bind the player to`);

        const player = new Player(this, node, options);
        this.players.set(options.guildId, player);
        return player;
    }

    /**
     * Get search results based on a query.
     * If the query is a link, it will attempt to get a track from the link. If not, it will return results from a search using the specified or default source.
     * @param query The query to search with.
     * @param requester The user that requested the track. This value is not crucial.
     * @param source The source to use if the query is not a link. Defaults to the manager's default source.
     * @returns The search result.
     */
    public async search (query: string, requester: string, source?: ManagerSearchSource): Promise<ManagerSearchResult> {
        const searchNode = this.availableNodes[0];
        if (!searchNode) throw new Error(`No nodes are available to perform a search`);

        const res = await searchNode.request(`GET`, `/loadtracks`, { query: { identifier: LavalinkConstants.URL_REGEX.test(query) ? query : `${LavalinkConstants.SOURCE_IDENTIFIERS[source ?? this.options.defaultSearchSource]}search:${query}` } });

        if (!res) throw new Error(`No search response data`);

        const searchResult: ManagerSearchResult = {
            loadType: res.loadType,
            tracks: res.tracks.map((data: TrackData) => new Track(data, requester)),
            exception: res.exception
        };

        if (res.playlistInfo) {
            searchResult.playlistInfo = {
                name: res.playlistInfo.Name,
                selectedTrack: typeof res.playlistInfo.selectedTrack === `number` ? searchResult.tracks[res.playlistInfo.selectedTrack] as Track : null
            };
        }

        return searchResult;
    }
}
