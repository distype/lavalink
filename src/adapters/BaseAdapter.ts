import { LavalinkManager } from '../structures/LavalinkManager';

import { GatewayVoiceStateUpdateData, RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody, Snowflake } from 'discord-api-types/v9';

/**
 * Permissions relevant to this wrapper.
 */
export interface Permissions {
    CONNECT: boolean
    EMBED_LINKS: boolean
    MUTE_MEMBERS: boolean
    REQUEST_TO_SPEAK: boolean
    SEND_MESSAGES: boolean
    SPEAK: boolean
    VIEW_CHANNEL: boolean
}

/**
 * An example library adapter.
 */
export abstract class BaseAdapter {
    /**
     * Should bind when your library gets a [voice server update](https://discord.com/developers/docs/topics/gateway#voice-server-update) or [voice state update](https://discord.com/developers/docs/topics/gateway#voice-state-update) with `LavalinkManager#_handleVoiceUpdate()`.
     * @param manager The manager to bind.
     */
    public abstract bind (manager: LavalinkManager): void

    /**
     * Should return the bot's ID.
     */
    public abstract getBotId (): Snowflake

    /**
     * Should return the guild's shard's [session ID](https://discord.com/developers/docs/topics/gateway#ready).
     * @param guildId The guild to get the shard [session ID](https://discord.com/developers/docs/topics/gateway#ready) from.
     */
    public abstract getGuildShardSessionId (guildId: Snowflake): string

    /**
     * Should check the bot's [permissions](https://discord.com/developers/docs/topics/permissions) in a guild / channel.
     * @param guildId The guild to pull permissions from.
     * @param channelId The channel to pull permissions from.
     */
    public abstract hasPerms (guildId: Snowflake, channelId?: Snowflake): Promise<Permissions> | Permissions

    /**
     * Should check if a channel is a [stage](https://discord.com/developers/docs/resources/channel#channel-object-channel-types).
     * @param channelId The channel to check.
     */
    public abstract isStage (channelId: Snowflake): Promise<boolean> | boolean

    /**
     * Should send a `PATCH` request to [`/guilds/:id/voice-states/@me`](https://discord.com/developers/docs/resources/guild#modify-current-user-voice-state).
     * @param guildId The guild's ID.
     * @param data Request data.
     */
    public abstract modifyCurrentUserVoiceState (guildId: Snowflake, data: RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody): Promise<void> | void

    /**
     * Should send a [voice state update](https://discord.com/developers/docs/topics/gateway#update-voice-state) (opcode 4) payload to the gateway.
     * @param data Voice state update data.
     */
    public abstract updateVoiceState (data: GatewayVoiceStateUpdateData): Promise<void> | void
}
