import { BaseAdapter, Permissions } from './BaseAdapter';

import { LavalinkManager } from '../typings/lib';

import { GatewayVoiceStateUpdateData, RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody, Snowflake } from 'discord-api-types/v9';

export class DiscordjsAdapter extends BaseAdapter {
    constructor (public client: any) {
        super();
    }

    public bind (manager: LavalinkManager): void {
        this.client.ws.on(`VOICE_SERVER_UPDATE`, (data: any) => void manager._handleVoiceUpdate(`VOICE_SERVER_UPDATE`, data));
        this.client.ws.on(`VOICE_STATE_UPDATE`, (data: any) => void manager._handleVoiceUpdate(`VOICE_STATE_UPDATE`, data));
    }

    public getBotId (): Snowflake {
        if (!this.client.user) throw new Error(`Gateway has not received a payload with a self user`);
        return this.client.user.id;
    }

    public async getGuildShardSessionId (guildId: Snowflake): Promise<string> {
        const sessionId = (this.client.guilds.cache.get(guildId) ?? await this.client.guilds.fetch(guildId)).shard.sessionId;
        if (!sessionId) throw new Error(`Guild shard has not received session ID`);
        return sessionId;
    }

    public async hasPerms (guildId: Snowflake, channelId?: Snowflake): Promise<Permissions> {
        const me = (this.client.guilds.cache.get(guildId) ?? await this.client.guilds.fetch(guildId)).me;
        const perms = channelId ? me?.permissionsIn(channelId) : me?.permissions;
        if (!perms) throw new Error(`Unable to get permissions`);

        return {
            CONNECT: perms.has(`CONNECT`),
            EMBED_LINKS: perms.has(`EMBED_LINKS`),
            MUTE_MEMBERS: perms.has(`MUTE_MEMBERS`),
            REQUEST_TO_SPEAK: perms.has(`REQUEST_TO_SPEAK`),
            SEND_MESSAGES: perms.has(`SEND_MESSAGES`),
            SPEAK: perms.has(`SPEAK`),
            VIEW_CHANNEL: perms.has(`VIEW_CHANNEL`)
        };
    }

    public async isStage (channelId: Snowflake): Promise<boolean> {
        const channel = (this.client.channels.cache.get(channelId) ?? await this.client.channels.fetch(channelId));
        if (!channel) throw new Error(`Unable to check if channel is a stage`);
        return channel.type === `GUILD_STAGE_VOICE`;
    }

    public async modifyCurrentUserVoiceState (guildId: Snowflake, data: RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody): Promise<void> {
        const voiceState = (this.client.guilds.cache.get(guildId) ?? await this.client.guilds.fetch(guildId)).voiceStates.cache.get(data.channel_id);
        if (!voiceState) throw new Error(`Unable to fetch the voice state to modify`);

        if (typeof data.suppress === `boolean`) voiceState.setSuppressed(data.suppress);
        if (data.request_to_speak_timestamp !== undefined) {
            const timeout = data.request_to_speak_timestamp !== null ? new Date(data.request_to_speak_timestamp).valueOf() - Date.now() : 0;
            if (timeout > 0) new Promise((resolve) => setTimeout(resolve, timeout));
            voiceState.setRequestToSpeak(data.request_to_speak_timestamp !== null);
        }
    }

    public async updateVoiceState (data: GatewayVoiceStateUpdateData): Promise<void> {
        // @ts-expect-error Cannot find module 'discord.js' or its corresponding type declarations.
        const { ShardClientUtil } = await import(`discord.js`);

        if (typeof this.client.shard?.count !== `number`) throw new Error(`Unable to get shard count`);
        const shard = this.client.ws.shards.get(ShardClientUtil.shardIdForGuildId(data.guild_id, this.client.shard.count));
        if (!shard) throw new Error(`Unable to get shard to send voice state update`);

        shard.send(data);
    }
}
