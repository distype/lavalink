import { BaseAdapter, Permissions } from './BaseAdapter';

import { LavalinkManager } from '../typings/lib';

import { ChannelType, GatewayVoiceStateUpdateData, RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody, Snowflake } from 'discord-api-types/v9';
import { CachedRole, Client, PermissionsUtils } from 'distype';

export class DistypeAdapter extends BaseAdapter {
    constructor (public client: Client) {
        super();
    }

    public bind (manager: LavalinkManager): void {
        this.client.gateway.on(`VOICE_SERVER_UPDATE`, (data) => manager._handleVoiceUpdate(`VOICE_SERVER_UPDATE`, data.d));
        this.client.gateway.on(`VOICE_STATE_UPDATE`, (data) => manager._handleVoiceUpdate(`VOICE_STATE_UPDATE`, data.d));
    }

    public getBotId (): Snowflake {
        if (!this.client.gateway.user) throw new Error(`Gateway has not received a payload with a self user`);
        return this.client.gateway.user.id;
    }

    public getGuildShardSessionId (guildId: Snowflake): string {
        const shard = this.client.gateway.guildShard(guildId, true);
        if (!shard.sessionId) throw new Error(`Guild shard has not received session ID`);
        return shard.sessionId;
    }

    public async hasPerms (guildId: Snowflake, channelId?: Snowflake): Promise<Permissions> {
        const cacheControlOptions = this.client.options.cache.cacheControl;

        const permissionsMember = { user: {
            id: this.getBotId(),
            roles: (cacheControlOptions.members?.includes(`roles`) ? this.client.cache.members?.get(guildId)?.get(this.getBotId())?.roles : undefined) ?? (await this.client.rest.getGuildMember(guildId, this.getBotId())).roles
        } };

        const permissionsGuild = {
            id: guildId,
            owner_id: (cacheControlOptions.guilds?.includes(`owner_id`) ? this.client.cache.guilds?.get(guildId)?.owner_id : undefined) ?? (await this.client.rest.getGuild(guildId)).owner_id,
            roles: (cacheControlOptions.roles?.includes(`permissions`)) ? this.client.cache.roles?.filter((role) => role.guild_id === guildId && role.permissions !== undefined) as (Array<CachedRole & { permissions: string }> | undefined) : undefined ?? (await this.client.rest.getGuildRoles(guildId))
        };

        const permissionsChannel = channelId ? { permission_overwrites: (cacheControlOptions.channels?.includes(`permission_overwrites`) ? this.client.cache.channels?.get(channelId)?.permission_overwrites : undefined) ?? (await this.client.rest.getChannel(channelId)).permission_overwrites } : undefined;

        const perms = channelId ? PermissionsUtils.channelPermissions(permissionsMember, permissionsGuild, permissionsChannel as NonNullable<typeof permissionsChannel>) : PermissionsUtils.guildPermissions(permissionsMember, permissionsGuild);

        return {
            CONNECT: PermissionsUtils.hasPerm(perms, `CONNECT`),
            EMBED_LINKS: PermissionsUtils.hasPerm(perms, `EMBED_LINKS`),
            MUTE_MEMBERS: PermissionsUtils.hasPerm(perms, `MUTE_MEMBERS`),
            REQUEST_TO_SPEAK: PermissionsUtils.hasPerm(perms, `REQUEST_TO_SPEAK`),
            SEND_MESSAGES: PermissionsUtils.hasPerm(perms, `SEND_MESSAGES`),
            SPEAK: PermissionsUtils.hasPerm(perms, `SPEAK`),
            VIEW_CHANNEL: PermissionsUtils.hasPerm(perms, `VIEW_CHANNEL`)
        };
    }

    public async isStage (channelId: Snowflake): Promise<boolean> {
        return (this.client.cache.channels?.get(channelId)?.type ?? (await this.client.rest.getChannel(channelId)).type) === ChannelType.GuildStageVoice;
    }

    public async modifyCurrentUserVoiceState (guildId: Snowflake, data: RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody): Promise<void> {
        return await this.client.rest.modifyCurrentUserVoiceState(guildId, data);
    }

    public async updateVoiceState (data: GatewayVoiceStateUpdateData): Promise<void> {
        return await this.client.gateway.updateVoiceState(data.guild_id, data.channel_id, data.self_mute, data.self_deaf);
    }
}
