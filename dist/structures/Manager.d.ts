import { Node, NodeOptions } from './Node';
import { Player, PlayerOptions } from './Player';
import { Track, TrackPartial } from './Track';
import { ExtendedMap, TypedEmitter } from '@br88c/node-utils';
import { Client, Snowflake } from 'distype';
/**
 * The result from a search.
 */
export interface ManagerSearchResult {
    /**
     * The result's load type.
     */
    loadType: `TRACK_LOADED` | `PLAYLIST_LOADED` | `SEARCH_RESULT` | `NO_MATCHES` | `LOAD_FAILED`;
    /**
     * The found tracks.
     */
    tracks: Array<Track | TrackPartial>;
    /**
     * Playlist info, if applicable.
     */
    playlistInfo?: {
        name: string;
        selectedTrack: Track | null;
    };
    /**
     * An exception, if applicable.
     */
    exception?: {
        message: string;
        severity: string;
    };
}
/**
 * A search source.
 */
export declare type ManagerSearchSource = `youtube` | `soundcloud`;
/**
 * {@link Manager} events.
 */
export interface ManagerEvents extends Record<string, (...args: any[]) => void> {
    READY: () => void;
}
/**
 * {@link Manager} options.
 */
export interface ManagerOptions {
    /**
     * The client name to use.
     * @default `@distype/lavalink`
     */
    clientName?: string;
    /**
     * The default searching source.
     * @default `youtube`
     */
    defaultSearchSource?: ManagerSearchSource;
    /**
     * An array of nodes to connect to.
     */
    nodeOptions: NodeOptions[];
    /**
     * The type of CPU load to sort by when getting the least load node.
     * @default `system`
     */
    leastLoadSort?: `system` | `lavalink`;
}
/**
 * The lavalink manager.
 */
export declare class Manager extends TypedEmitter<ManagerEvents> {
    /**
     * The client used by the manager.
     */
    client: Client;
    /**
     * The manager's nodes.
     */
    nodes: ExtendedMap<number, Node>;
    /**
     * The manager's players.
     */
    players: ExtendedMap<Snowflake, Player>;
    /**
     * {@link ManagerOptions Options} for the manager.
     */
    readonly options: Required<ManagerOptions>;
    /**
     * Create a lavalink manager.
     * @param client The manager's Distype client.
     * @param options The {@link ManagerOptions options} to use for the manager.
     */
    constructor(client: Client, options: ManagerOptions);
    /**
     * Available nodes sorted by cpu load.
     */
    get availableNodes(): Node[];
    /**
     * Spawn all nodes.
     * @returns The results of node connection attempts.
     */
    spawnNodes(): Promise<void>;
    /**
     * Create a new player.
     * @param options The player's options.
     * @returns The created player.
     */
    createPlayer(options: PlayerOptions): Player;
    /**
     * Get search results based on a query.
     * If the query is a link, it will attempt to get a track from the link. If not, it will return results from a search using the specified or default source.
     * @param query The query to search with.
     * @param requester The user that requested the track. This value is not crucial.
     * @param source The source to use if the query is not a link. Defaults to the manager's default source.
     * @returns The search result.
     */
    search(query: string, requester: string, source?: ManagerSearchSource): Promise<ManagerSearchResult>;
}
