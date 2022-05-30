import { Manager } from './Manager';
import { Node } from './Node';
import { Track } from './Track';
import { LogCallback } from '../types/Log';
import { TypedEmitter } from '@br88c/node-utils';
import { GatewayVoiceStateUpdateDispatchData } from 'discord-api-types/v10';
import { Snowflake } from 'distype';
/**
 * {@link Player} events.
 */
export declare type PlayerEvents = {
    /**
     * When the {@link Player player} connects to the first voice channel.
     */
    VOICE_CONNECTED: (channel: Snowflake) => void;
    /**
     * When the bot is moved to a different voice channel.
     */
    VOICE_MOVED: (newChannel: Snowflake) => void;
    /**
     * When the {@link Player player} is destroyed.
     */
    DESTROYED: (reason: string) => void;
    /**
     * When the {@link Player player} is paused.
     */
    PAUSED: () => void;
    /**
     * When the {@link Player player} is resumed.
     */
    RESUMED: () => void;
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track end event.
     */
    TRACK_END: (reason: string, track?: Track) => void;
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track exception event.
     */
    TRACK_EXCEPTION: (message: string, severity: string, cause: string, track?: Track) => void;
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track start event.
     */
    TRACK_START: (track?: Track) => void;
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track stuck event.
     */
    TRACK_STUCK: (thresholdMs: number, track?: Track) => void;
    /**
     * When the {@link Player player}'s {@link Node node} receives a voice websocket close.
     */
    WEBSOCKET_CLOSED: (code: number, reason: string, byRemote: boolean) => void;
};
/**
 * Filters to apply to tracks.
 * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#using-filters)
 */
export interface PlayerFilters {
    channelMix?: {
        leftToLeft: number;
        leftToRight: number;
        rightToLeft: number;
        rightToRight: number;
    };
    distortion?: {
        sinOffset: number;
        sinScale: number;
        cosOffset: number;
        cosScale: number;
        tanOffset: number;
        tanScale: number;
        offset: number;
        scale: number;
    };
    equalizer?: Array<{
        band: number;
        gain: number;
    }>;
    karaoke?: {
        level: number;
        monoLevel: number;
        filterBand: number;
        filterWidth: number;
    };
    lowPass?: {
        smoothing: number;
    };
    rotation?: {
        rotationHz: number;
    };
    timescale?: {
        speed?: number;
        pitch?: number;
        rate?: number;
    };
    tremolo?: {
        frequency: number;
        depth: number;
    };
    vibrato?: {
        frequency: number;
        depth: number;
    };
}
/**
 * A loop type for a {@link Player player}.
 */
export declare type PlayerLoopType = `off` | `single` | `queue`;
/**
 * {@link Player} options.
 */
export interface PlayerOptions {
    /**
     * The amount of time to allow to connect to a VC before timing out.
     * @default 15000
     */
    connectionTimeout?: number;
    /**
     * If the bot should self deafen.
     * @default true
     */
    selfDeafen?: boolean;
}
/**
 * Options for playing a track with the {@link Player player}.
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
    CONNECTED = 1,
    PAUSED = 2,
    PLAYING = 3
}
/**
 * A Lavalink player.
 */
export declare class Player extends TypedEmitter<PlayerEvents> {
    /**
     * The player's {@link PlayerFilters filters}.
     */
    filters: PlayerFilters;
    /**
     * The player's current {@link PlayerLoopType loop behavior}.
     */
    loop: PlayerLoopType;
    /**
     * The player's {@link Manager manager}.
     */
    manager: Manager;
    /**
     * The player's {@link Node node}.
     */
    node: Node;
    /**
     * The queue.
     */
    queue: Track[];
    /**
     * The current song playing, represented as an index of Player#queue. This is null if there isn't a song currently playing.
     */
    queuePosition: number | null;
    /**
     * The player's {@link PlayerState state}.
     */
    state: PlayerState;
    /**
     * The player's text channel.
     */
    textChannel: Snowflake;
    /**
     * The current track's position. `null` if nothing is playing.
     */
    trackPosition: number | null;
    /**
     * The player's voice channel.
     */
    voiceChannel: Snowflake;
    /**
     * The player's volume.
     */
    volume: number;
    /**
     * The player's guild.
     */
    readonly guild: Snowflake;
    /**
     * {@link PlayerOptions Options} for the player.
     */
    readonly options: Required<PlayerOptions>;
    /**
     * The system string used for emitting errors and for the {@link LogCallback log callback}.
     */
    readonly system: `Lavalink Player ${Snowflake}`;
    /**
     * If the bot is a speaker. Only applicable if the voice channel is a stage.
     */
    private _isSpeaker;
    /**
     * If the connected voice channel is a stage.
     */
    private _isStage;
    /**
     * The {@link LogCallback log callback} used by the node.
     */
    private _log;
    /**
     * A helper variable for setting the player's state after sending a play op with pause set to true.
     */
    private _sentPausedPlay;
    /**
     * If the player is connecting.
     */
    private _spinning;
    /**
     * Create a Lavalink player.
     * @param manager The player's {@link Manager manager}.
     * @param node The player's node.
     * @param guild The player's guild.
     * @param textChannel The player's text channel.
     * @param voiceChannel The player's voice channel.
     * @param options The player's {@link PlayerOptions options}.
     * @param logCallback A {@link LogCallback callback} to be used for logging events internally in the player.
     * @param logThisArg A value to use as `this` in the `logCallback`.
     */
    constructor(manager: Manager, node: Node, guild: Snowflake, textChannel: Snowflake, voiceChannel: Snowflake, options?: PlayerOptions, logCallback?: LogCallback, logThisArg?: any);
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
    get currentTrack(): Track | undefined;
    /**
     * Connect to the voice channel.
     */
    connect(): Promise<void>;
    /**
     * Queue and play a track or tracks.
     * If a track is already playing, the specified track(s) will only be pushed to the queue.
     * @param track The track or track partial to queue and play.
     * @param options Play options.
     * @returns The track played.
     */
    play(track: Track | Track[], options?: PlayerPlayOptions): Promise<void>;
    /**
     * Destroy the player.
     * @param reason The reason the player was destroyed.
     */
    destroy(reason?: string): void;
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
    pause(): Promise<void>;
    /**
     * Resume a track.
     */
    resume(): Promise<void>;
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
    remove(index: number, advanceQueue?: boolean): Promise<Track | undefined>;
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
    setFilters(filters: PlayerFilters): Promise<void>;
    /**
     * Handle the bot being moved.
     * Only events with the bot's user ID in the player's guild should be passed to this method.
     * @param data [Voice state update](https://discord.com/developers/docs/topics/gateway#voice-state-update) data.
     * @internal
     */
    handleMove(data: GatewayVoiceStateUpdateDispatchData): Promise<void>;
    /**
     * Handle incoming payloads from the attached node.
     * @param payload The received payload.
     * @internal
     */
    handlePayload(payload: any): Promise<void>;
    /**
     * Advance the queue.
     */
    private _advanceQueue;
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
