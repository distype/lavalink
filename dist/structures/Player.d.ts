import { Permissions } from '../adapters/BaseAdapter';
import { Filters } from '../typings/Lavalink';
import { LavalinkManager, Node, Track, TrackPartial } from '../typings/lib';
import { TypedEmitter } from '../util/TypedEmitter';
import { GatewayVoiceStateUpdateDispatchData, Snowflake } from 'discord-api-types/v9';
/**
 * {@link Player} events.
 */
export interface PlayerEvents {
    /**
     * Emitted when the player connects to a VC.
     */
    CONNECTED: Player;
    /**
     * Emitted when the player is created.
     */
    CREATED: Player;
    /**
     * Emitted when the player is destroyed.
     */
    DESTROYED: {
        player: Player;
        reason: string;
    };
    /**
     * Emitted when the player encounters an error.
     */
    ERROR: {
        player: Player;
        error: Error;
    };
    /**
     * Emitted when the player manually moved. This includes the bot joining or leaving a VC.
     * The player is also automatically paused or destroyed when this event is emitted.
     */
    MOVED: {
        player: Player;
        oldChannel: Snowflake | null;
        newChannel: Snowflake | null;
    };
    /**
     * Emitted when the player is paused.
     */
    PAUSED: {
        player: Player;
        reason: string;
    };
    /**
     * Emitted when the player is resumed.
     */
    RESUMED: {
        player: Player;
        reason: string;
    };
    /**
     * Emitted when the server sends a track end event.
     */
    TRACK_END: {
        player: Player;
        track: Track | null;
        reason: string;
    };
    /**
     * Emitted when the server sends a track exception event.
     */
    TRACK_EXCEPTION: {
        player: Player;
        track: Track | null;
        message: string;
        severity: string;
        cause: string;
    };
    /**
     * Emitted when the server sends a track start event.
     */
    TRACK_START: {
        player: Player;
        track: Track | null;
    };
    /**
     * Emitted when the server sends a track stuck event.
     */
    TRACK_STUCK: {
        player: Player;
        track: Track | null;
        thresholdMs: number;
    };
}
/**
 * A {@link Player player}'s loop type.
 */
export declare type PlayerLoopType = `off` | `single` | `queue`;
/**
 * Options used when creating a {@link Player player}.
 */
export interface PlayerOptions extends Partial<PlayerOptionsComplete> {
    guildId: Snowflake;
    textChannelId: Snowflake;
    voiceChannelId: Snowflake;
}
/**
 * Complete {@link Player player} options.
 */
export interface PlayerOptionsComplete {
    /**
     * If the bot should request to or become a speaker in stage channels depending on it's permissions.
     * @default true
     */
    becomeSpeaker: boolean;
    /**
     * The amount of time to allow to connect to a VC before timing out.
     * @default 15000
     */
    connectionTimeout: number;
    /**
     * The guild ID to bind the player to.
     */
    guildId: Snowflake;
    /**
     * Behavior to use when the bot is moved from the VC (This includes the bot being disconnected).
     * 'destroy' will destroy the player.
     * 'pause' will send a pause payload to the lavalink server, and will resume when the bot is reconnected to the VC.
     * @default 'destroy'
     */
    moveBehavior: `destroy` | `pause`;
    /**
     * If the bot should self deafen.
     * @default true
     */
    selfDeafen: boolean;
    /**
     * If the bot should self mute.
     * @default false
     */
    selfMute: boolean;
    /**
     * Behavior to use when the bot is moved to the audience in a stage channel. This has no effect if becomeSpeaker is false.
     * 'destroy' will destroy the player.
     * 'pause' will send a pause payload to the lavalink server, and will resume when the bot is a speaker again. The bot will also request to speak, or become a speaker if it cannot request.
     * @default 'pause'
     */
    stageMoveBehavior: `destroy` | `pause`;
    /**
     * The text channel ID to bind the player to.
     */
    textChannelId: Snowflake;
    /**
     * The voice channel ID to bind the player to.
     */
    voiceChannelId: Snowflake;
}
/**
 * Options used for `Player#play`.
 */
export interface PlayerPlayOptions {
    /**
     * The number of milliseconds to offset the track by.
     * @default 0
     */
    startTime?: number;
    /**
     * The number of milliseconds at which point the track should stop playing. Defaults to the track's length.
     */
    endTime?: number;
    /**
     * The volume to use. Minimum value of 0, maximum value of 1000.
     * @default 100
     */
    volume?: number;
    /**
     * If true, playback will be paused when the track starts. This is ignored if the bot is in the audience in a stage.
     * @default false
     */
    pause?: boolean;
}
/**
 * A {@link Player player}'s state.
 */
export declare enum PlayerState {
    DISCONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2,
    PAUSED = 3,
    PLAYING = 4,
    DESTROYED = 5
}
/**
 * A player.
 * Manages a persistent queue, as well as voice state changes, stage channels, permissions, etc.
 */
export declare class Player extends TypedEmitter<PlayerEvents> {
    node: Node;
    manager: LavalinkManager;
    /**
     * The player's current voice channel.
     */
    currentVoiceChannel: Snowflake | null;
    /**
     * The player's filters.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#using-filters)
     */
    filters: Filters;
    /**
     * If the player is a speaker in a stage channel. This is null if the player isn't connected, if the `becomeSpeaker` option is false, or if the channel is not a stage channel.
     * This is initially set when running Player#connect().
     */
    isSpeaker: boolean | null;
    /**
     * If the voice channel is a stage.
     * This is set when running Player#connect().
     */
    isStage: boolean | null;
    /**
     * The queue's {@link PlayerLoopType loop behavior}.
     */
    loop: PlayerLoopType;
    /**
     * The position in the track playing, in milliseconds.
     * This is null if no track is playing.
     */
    position: number | null;
    /**
     * The queue.
     */
    queue: Array<Track | TrackPartial>;
    /**
     * The current song playing, represented as an index of Player#queue. This is null if there isn't a song currently playing.
     */
    queuePosition: number | null;
    /**
     * The player's {@link PlayerState state}.
     */
    state: PlayerState;
    /**
     * The player's volume.
     */
    volume: number;
    /**
     * The player's options.
     */
    readonly options: PlayerOptionsComplete;
    /**
     * The last recieved voice state data.
     */
    private _lastVoiceState;
    /**
     * A helper variable for setting the player's state after sending a play op with pause set to true.
     */
    private _sentPausedPlay;
    /**
     * Create a player.
     * @param options The {@link PlayerOptions options} to use for the player.
     * @param node The player's {@link Node node}.
     * @param manager The player's {@link LavalinkManager manager}.
     */
    constructor(options: PlayerOptions, node: Node, manager: LavalinkManager);
    /**
     * If the player is paused.
     */
    get paused(): boolean;
    /**
     * If the player is playing a track.
     */
    get playing(): boolean;
    /**
     * The current track playing.
     */
    get currentTrack(): Track | TrackPartial | null;
    /**
     * Checks if the bot has necessary permissions. Usefull for preventing `403` errors from Discord, and should be ran before using `Player#connect()`.
     * Returns missing permissions. Ignores stage permissions if `Player#options#becomeSpeaker` is false.
     */
    checkPermissions(): Promise<{
        text: Array<keyof Permissions>;
        voice: Array<keyof Permissions>;
    }>;
    /**
     * Connect to a voice channel.
     * The player must be in a disconnected state.
     */
    connect(): Promise<void>;
    /**
     * Destroy the player.
     * @param reason The reason the player was destroyed.
     */
    destroy(reason?: string): void;
    /**
     * Queue and play a track or tracks.
     * If a track is already playing, the specified track(s) will only be pushed to the queue.
     * @param track The track or track partial to queue and play.
     * @param options Play options.
     * @returns The track played.
     */
    play(track: (Track | TrackPartial) | Array<Track | TrackPartial>, options?: PlayerPlayOptions): Promise<void>;
    /**
     * Skip to the next track based on the player's loop behavior, or to a specified index of the queue.
     * @param index The index to skip to.
     */
    skip(index?: number): Promise<void>;
    /**
     * Shuffles the queue and starts playing the first track.
     */
    shuffle(): Promise<void>;
    /**
     * Seek to a desired position.
     * @param position The position in the track to seek to, in milliseconds.
     */
    seek(position: number): Promise<void>;
    /**
     * Pause a track.
     */
    pause(reason?: string): Promise<void>;
    /**
     * Resume a track.
     */
    resume(reason?: string): Promise<void>;
    /**
     * Stop the player.
     */
    stop(): Promise<void>;
    /**
     * Remove a track from the queue.
     * @param index The index of the track to remove.
     * @param advanceQueue If the queue should advance if the removed track is the current track playing. If false, the player will be stopped. Defaults to true.
     * @returns The removed track.
     */
    remove(index: number, advanceQueue?: boolean): Promise<Track | TrackPartial>;
    /**
     * Clear the queue.
     * @param stop If true, if a track is currently playing it will be stopped and removed from the queue. If false, if a track is playing it will be preserved. Defaults to false.
     */
    clear(stop?: boolean): Promise<void>;
    /**
     * Set the queue's loop behavior.
     * @param type The loop type to use.
     */
    setLoop(type: PlayerLoopType): void;
    /**
     * Set the player's volume.
     * @param volume The volume to set the player to. Must be between 0 and 1000, inclusive.
     */
    setVolume(volume: number): Promise<void>;
    /**
     * Set the player's filters.
     * @param filters The filters to use. An empty object clears filters.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#using-filters)
     */
    setFilters(filters: Filters): Promise<void>;
    /**
     * Handle the bot being moved.
     * @param newChannel The new voice channel ID.
     * @param data [Voice state update](https://discord.com/developers/docs/topics/gateway#voice-state-update) data.
     * @internal
     */
    _handleMove(newChannel: Snowflake | null, data: GatewayVoiceStateUpdateDispatchData): Promise<void>;
    /**
     * Advance the queue.
     */
    private _advanceQueue;
    /**
     * Disconnect the bot from VC.
     */
    private _disconnect;
    /**
     * Handle incoming payloads from the attached node.
     * @param payload The received payload.
     */
    private _handlePayload;
    /**
     * Helper function for sending play payloads to the server.
     * @param track The track to play.
     * @param options Options to use in the play payload.
     */
    private _play;
    /**
     * Helper function for sending stop payloads to the server.
     */
    private _stop;
}
