import { Node, NodeOptions } from './Node';
import { Player, PlayerOptions } from './Player';
import { Track } from './Track';
import { LogCallback } from '../types/Log';
import { LavalinkConstants } from '../utils/LavalinkConstants';
import { ExtendedMap, TypedEmitter } from '@br88c/node-utils';
import { Client, Snowflake } from 'distype';
/**
 * The result from a search.
 */
export interface ManagerSearchResult {
    /**
     * The result's load type.
     */
    loadType: (typeof LavalinkConstants.LOAD_TYPES)[number];
    /**
     * The found tracks.
     */
    tracks: Track[];
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
export declare type ManagerSearchSource = (typeof LavalinkConstants.SOURCE_IDENTIFIERS)[number];
/**
 * {@link Manager} events.
 */
export declare type ManagerEvents = {
    /**
     * When all {@link Node nodes} are spawned and ready.
     */
    NODES_READY: (success: number, failed: number) => void;
    /**
     * When a {@link Node node} receives a payload.
     */
    NODE_RECEIVED_MESSAGE: (payload: any) => void;
    /**
     * When a payload is sent.
     */
    NODE_SENT_PAYLOAD: (payload: string) => void;
    /**
     * When a {@link Node node} enters an {@link NodeState idle state}.
     */
    NODE_IDLE: (node: Node) => void;
    /**
     * When a {@link Node node} enters a {@link NodeState connecting state}.
     */
    NODE_CONNECTING: (node: Node) => void;
    /**
     * When a {@link Node node} enters a {@link NodeState running state}.
     */
    NODE_RUNNING: (node: Node) => void;
    /**
     * When a {@link Node node} enters a {@link NodeState disconnected state}.
     */
    NODE_DISCONNECTED: (node: Node) => void;
    /**
     * When a {@link Player player} connects to the first voice channel.
     */
    PLAYER_VOICE_CONNECTED: (player: Player, channel: Snowflake) => void;
    /**
     * When a the bot is moved to a different voice channel.
     */
    PLAYER_VOICE_MOVED: (player: Player, newChannel: Snowflake) => void;
    /**
     * When a {@link Player player} is destroyed.
     */
    PLAYER_DESTROYED: (player: Player, reason: string) => void;
    /**
     * When a {@link Player player} is paused.
     */
    PLAYER_PAUSED: (player: Player) => void;
    /**
     * When a {@link Player player} is resumed.
     */
    PLAYER_RESUMED: (player: Player) => void;
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track end event.
     */
    PLAYER_TRACK_END: (player: Player, reason: string, track?: Track) => void;
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track exception event.
     */
    PLAYER_TRACK_EXCEPTION: (player: Player, message: string, severity: string, cause: string, track?: Track) => void;
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track start event.
     */
    PLAYER_TRACK_START: (player: Player, track?: Track) => void;
    /**
     * Emitted when a {@link Player player}'s {@link Node node} sends a track stuck event.
     */
    PLAYER_TRACK_STUCK: (player: Player, thresholdMs: number, track?: Track) => void;
    /**
     * When a {@link Player player}'s {@link Node node} receives a voice websocket close. Note that `4014` close codes are not emitted.
     */
    PLAYER_WEBSOCKET_CLOSED: (player: Player, code: number, reason: string, byRemote: boolean) => void;
};
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
     * @default `yt`
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
 * The Lavalink manager.
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
     * The system string used for emitting errors and for the {@link LogCallback log callback}.
     */
    readonly system = "Lavalink Manager";
    /**
     * The {@link LogCallback log callback} used by the node.
     */
    private _log;
    /**
     * A value to use as `this` in the `this#_log`.
     */
    private _logThisArg?;
    /**
     * Create a lavalink manager.
     * @param client The manager's Distype client.
     * @param options The {@link ManagerOptions options} to use for the manager.
     */
    constructor(client: Client, options: ManagerOptions, logCallback?: LogCallback, logThisArg?: any);
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
     * Gets the average ping across all nodes.
     * @returns The average ping in milliseconds.
     */
    averagePing(): Promise<number>;
    /**
     * Creates a new player. This method DOES NOT connect it to a voice channel (use `preparePlayer()` instead).
     * If a player for the specified guild already exists, it is returned and no new player is created.
     * @param guild The player's guild.
     * @param voiceChannel The player's voice channel.
     * @param options The player's options.
     * @returns The created player.
     */
    createPlayer(guild: Snowflake, voiceChannel: Snowflake, options?: PlayerOptions): Player;
    /**
     * Creates a new player and connects it to the voice channel. Also checks channel permissions.
     * The player is not permanently saved or bound to the manager if it fails to connect or doesn't have sufficient permissions.
     * If a player for the specified guild already exists, it is returned and no new player is created. If it is disconnected, it is automatically connected.
     * @param guild The player's guild.
     * @param voiceChannel The player's voice channel.
     * @param options The player's options.
     * @returns The created player.
     */
    preparePlayer(guild: Snowflake, voiceChannel: Snowflake, options?: PlayerOptions): Promise<Player>;
    /**
     * Get search results based on a query.
     * If the query is a link, it will attempt to get a track from the link. If not, it will return results from a search using the specified or default source.
     * @param query The query to search with.
     * @param requester The user that requested the track. This value can be anything, and solely exists for your convenience.
     * @param source The source to use if the query is not a link. Defaults to the manager's default source.
     * @returns The search result.
     */
    search(query: string, requester?: string, source?: ManagerSearchSource): Promise<ManagerSearchResult>;
    /**
     * Decode track strings into an array of tracks.
     * @param tracks The tracks encoded in base64.
     * @returns An array of the decoded tracks.
     */
    decodeTracks(...tracks: string[]): Promise<Track[]>;
    /**
     * Handle incoming voice server update payloads.
     * @param payload The payload.
     */
    private _handleVoiceServerUpdate;
    /**
     * Handle incoming voice state updates.
     * @param payload The payload.
     */
    private _handleVoiceStateUpdate;
}
