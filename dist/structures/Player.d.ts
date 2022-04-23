import { Manager } from './Manager';
import { Node } from './Node';
import { LogCallback } from '../types/Log';
import { Snowflake } from 'distype';
export interface PlayerOptions {
    /**
     * If the bot should request to or become a speaker in stage channels depending on it's permissions.
     * @default true
     */
    becomeSpeaker?: boolean;
    /**
     * The amount of time to allow to connect to a VC before timing out.
     * @default 15000
     */
    connectionTimeout?: number;
    /**
     * The guild ID to bind the player to.
     */
    guildId: Snowflake;
    /**
     * If the bot should self deafen.
     * @default true
     */
    selfDeafen?: boolean;
    /**
     * If the bot should self mute.
     * @default false
     */
    selfMute?: boolean;
    /**
     * The text channel ID to bind the player to.
     */
    textChannelId: Snowflake;
    /**
     * The voice channel ID to bind the player to.
     */
    voiceChannelId: Snowflake;
}
export declare class Player {
    /**
     * The player's {@link Manager manager}.
     */
    manager: Manager;
    /**
     * The player's {@link Node node}.
     */
    node: Node;
    /**
     * {@link PlayerOptions Options} for the player.
     */
    readonly options: Required<PlayerOptions>;
    /**
     * The system string used for emitting errors and for the {@link LogCallback log callback}.
     */
    readonly system: `Lavalink Player ${Snowflake}`;
    /**
     * The {@link LogCallback log callback} used by the node.
     */
    private _log;
    /**
     * Create a lavalink player.
     * @param manager The player's {@link Manager manager}.
     * @param node The player's node.
     * @param options The player's {@link PlayerOptions options}.
     * @param logCallback A {@link LogCallback callback} to be used for logging events internally in the player.
     * @param logThisArg A value to use as `this` in the `logCallback`.
     */
    constructor(manager: Manager, node: Node, options: PlayerOptions, logCallback?: LogCallback, logThisArg?: any);
}
