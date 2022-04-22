import { NodeOptions, NodeRequestOptions } from './Node';
import { PlayerOptions } from './Player';
import { Node, Player, Track, TrackPartial } from '../typings/lib';
import { ExtendedMap, TypedEmitter } from '@br88c/node-utils';
import { GatewayVoiceServerUpdateDispatchData, GatewayVoiceStateUpdateDispatchData } from 'discord-api-types/v10';
import { Client, Snowflake } from 'distype';
export interface CompleteLavalinkManagerOptions {
    /**
     * An array of nodes to connect to.
     */
    nodeOptions: NodeOptions[];
    /**
     * An array of enabled sources.
     * If spotify is specified, the spotifyAuth option should also be defined.
     * @default ['youtube', 'soundcloud']
     */
    enabledSources: Source[];
    /**
     * The default source to use for searches.
     * @default 'youtube'
     */
    defaultSource: Source;
    /**
     * The type of CPU load to sort by when getting the least load node.
     * @default 'system'
     */
    leastLoadSort: `system` | `lavalink`;
    /**
     * Authentication for the spotify API.
     * This will enable resolving spotify links into youtube tracks.
     */
    spotifyAuth?: {
        clientId: string;
        clientSecret: string;
    };
    /**
     * The default request options to use when sending requests to spotify.
     */
    defaultSpotifyRequestOptions?: NodeRequestOptions;
}
export interface LavalinkManagerEvents extends Record<string, (...args: any[]) => void> {
    /**
     * Emitted when a node connects to it's lavalink server.
     */
    NODE_CONNECTED: (node: Node) => void;
    /**
     * Emitted when a node is created.
     */
    NODE_CREATED: (node: Node) => void;
    /**
     * Emitted when a node is destroyed.
     */
    NODE_DESTROYED: (node: Node, reason: string) => void;
    /**
     * Emitted when a node disconnects from it's lavalink server.
     */
    NODE_DISCONNECTED: (node: Node, code: number, reason: string) => void;
    /**
     * Emitted when a node encounters an error.
     */
    NODE_ERROR: (node: Node, error: Error) => void;
    /**
     * Emitted when a node receives a payload from it's server.
     */
    NODE_RAW: (node: Node, payload: any) => void;
    /**
     * Emitted when a node is attempting to reconnect.
     */
    NODE_RECONNECTING: (node: Node) => void;
    /**
     * Emitted when a player connects to a VC.
     */
    PLAYER_CONNECTED: (player: Player) => void;
    /**
     * Emitted when a player is created.
     */
    PLAYER_CREATED: (player: Player) => void;
    /**
     * Emitted when a player is destroyed.
     */
    PLAYER_DESTROYED: (player: Player, reason: string) => void;
    /**
     * Emitted when a player encounters an error.
     */
    PLAYER_ERROR: (player: Player, error: Error) => void;
    /**
     * Emitted when a player manually moved. This includes the bot joining or leaving a VC.
     * The player is also automatically paused or destroyed when this event is emitted.
     */
    PLAYER_MOVED: (player: Player, oldChannel: Snowflake | null, newChannel: Snowflake | null) => void;
    /**
     * Emitted when a player is paused.
     */
    PLAYER_PAUSED: (player: Player, reason: string) => void;
    /**
     * Emitted when a player is resumed.
     */
    PLAYER_RESUMED: (player: Player, reason: string) => void;
    /**
     * Emitted when the server sends a track end event.
     */
    PLAYER_TRACK_END: (player: Player, track: Track | null, reason: string) => void;
    /**
     * Emitted when the server sends a track exception event.
     */
    PLAYER_TRACK_EXCEPTION: (player: Player, track: Track | null, message: string, severity: string, cause: string) => void;
    /**
     * Emitted when the server sends a track start event.
     */
    PLAYER_TRACK_START: (player: Player, track: Track | null) => void;
    /**
     * Emitted when the server sends a track stuck event.
     */
    PLAYER_TRACK_STUCK: (player: Player, track: Track | null, thresholdMs: number) => void;
    /**
     * Emitted when the lavalink manager authorizes with spotify, or renews it's spotify token.
     */
    SPOTIFY_AUTHORIZED: (expiresIn: number, token: string) => void;
    /**
     * Emitted when there is an error authorizing with spotify.
     */
    SPOTIFY_AUTH_ERROR: (error: Error) => void;
}
export interface LavalinkManagerOptions extends Partial<CompleteLavalinkManagerOptions> {
    /**
     * An array of nodes to connect to.
     */
    nodeOptions: NodeOptions[];
}
/**
 * The result from a search.
 */
export interface SearchResult {
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
export declare type Source = `youtube` | `soundcloud`;
export declare class LavalinkManager extends TypedEmitter<LavalinkManagerEvents> {
    client: Client;
    /**
     * The manager's nodes.
     */
    nodes: ExtendedMap<number, Node>;
    /**
     * The manager's options.
     */
    readonly options: CompleteLavalinkManagerOptions;
    /**
     * The manager's players.
     */
    players: ExtendedMap<Snowflake, Player>;
    /**
     * The manager's spotify token.
     * Set when running LavalinkManager#connectNodes().
     */
    spotifyToken: string | null;
    /**
     * Create a lavalink manager.
     * @param options The options to use for the manager.
     * @param client The manager's client.
     */
    constructor(options: LavalinkManagerOptions, client: Client);
    /**
     * Nodes sorted by cpu load.
     */
    get leastLoadNodes(): Node[];
    /**
     * Connect all nodes to their server.
     * @returns The results of node connection attempts.
     */
    connectNodes(): Promise<Array<PromiseSettledResult<Node>>>;
    /**
     * Create a new player.
     * @param options The player's options.
     * @returns The created player.
     */
    createPlayer(options: PlayerOptions): Player;
    /**
     * Get search results based on a query.
     * If the query is a link, it will attempt to get a track from the link. If not, it will return results from a search using the specified or default source.
     * If spotify auth is defined in the manager config, spotify links will resolve into youtube tracks.
     * @param query The query to search with.
     * @param requester The user that requsted the track. This value is not crucial.
     * @param source The source to use if the query is not a link, or if the link is from spotify. Defaults to the manager's default source.
     * @returns The search result.
     */
    search(query: string, requester: string, source?: Source): Promise<SearchResult>;
    /**
     * Decode track strings into an array of tracks.
     * @param tracks The tracks encoded in base64.
     * @returns An array of the decoded tracks.
     */
    decodeTracks(tracks: string[]): Promise<Track[]>;
    /**
     * Resolve a track partial into a track.
     * @param track The track partial to resolve.
     * @returns The resolved track.
     */
    resolveTrack(track: TrackPartial): Promise<Track>;
    /**
     * Handle voice state update data.
     * @param event The emitted event.
     * @param data Data from the event.
     * @internal
     */
    _handleVoiceUpdate<T extends `VOICE_SERVER_UPDATE` | `VOICE_STATE_UPDATE`>(event: T, data: T extends `VOICE_SERVER_UPDATE` ? GatewayVoiceServerUpdateDispatchData : GatewayVoiceStateUpdateDispatchData): void;
    /**
     * Authorize with Spotify.
     * @returns The time the token is valid for in milliseconds.
     */
    private _authorizeSpotify;
    /**
     * A helper function to loop renewing spotify tokens.
     */
    private _renewSpotifyLoop;
}
