"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistypeAdapter = void 0;
const BaseAdapter_1 = require("./BaseAdapter");
class DistypeAdapter extends BaseAdapter_1.BaseAdapter {
    constructor(client) {
        super();
        this.client = client;
    }
    bind(manager) {
        this.client.gateway.on(`VOICE_SERVER_UPDATE`, (data) => void manager._handleVoiceUpdate(`VOICE_SERVER_UPDATE`, data.d));
        this.client.gateway.on(`VOICE_STATE_UPDATE`, (data) => void manager._handleVoiceUpdate(`VOICE_STATE_UPDATE`, data.d));
    }
    getBotId() {
        if (!this.client.gateway.user)
            throw new Error(`Gateway has not received a payload with a self user`);
        return this.client.gateway.user.id;
    }
    getGuildShardSessionId(guildId) {
        const shard = this.client.gateway.guildShard(guildId, true);
        if (!shard.sessionId)
            throw new Error(`Guild shard has not received session ID`);
        return shard.sessionId;
    }
    async hasPerms(guildId, channelId) {
        // @ts-expect-error Cannot find module 'distype' or its corresponding type declarations.
        const { PermissionsUtils } = await Promise.resolve().then(() => __importStar(require(`distype`)));
        const cacheControlOptions = this.client.options.cache.cacheControl;
        const permissionsMember = { user: {
                id: this.getBotId(),
                roles: (cacheControlOptions.members?.includes(`roles`) ? this.client.cache.members?.get(guildId)?.get(this.getBotId())?.roles : undefined) ?? (await this.client.rest.getGuildMember(guildId, this.getBotId())).roles
            } };
        const permissionsGuild = {
            id: guildId,
            owner_id: (cacheControlOptions.guilds?.includes(`owner_id`) ? this.client.cache.guilds?.get(guildId)?.owner_id : undefined) ?? (await this.client.rest.getGuild(guildId)).owner_id,
            roles: (cacheControlOptions.roles?.includes(`permissions`)) ? this.client.cache.roles?.filter((role) => role.guild_id === guildId && role.permissions !== undefined) : undefined ?? (await this.client.rest.getGuildRoles(guildId))
        };
        const permissionsChannel = channelId ? { permission_overwrites: (cacheControlOptions.channels?.includes(`permission_overwrites`) ? this.client.cache.channels?.get(channelId)?.permission_overwrites : undefined) ?? (await this.client.rest.getChannel(channelId)).permission_overwrites } : undefined;
        const perms = channelId ? PermissionsUtils.channelPermissions(permissionsMember, permissionsGuild, permissionsChannel) : PermissionsUtils.guildPermissions(permissionsMember, permissionsGuild);
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
    async isStage(channelId) {
        return (this.client.cache.channels?.get(channelId)?.type ?? (await this.client.rest.getChannel(channelId)).type) === 13 /* GuildStageVoice */;
    }
    async modifyCurrentUserVoiceState(guildId, data) {
        return await this.client.rest.modifyCurrentUserVoiceState(guildId, data);
    }
    async updateVoiceState(data) {
        return await this.client.gateway.updateVoiceState(data.guild_id, data.channel_id, data.self_mute, data.self_deaf);
    }
}
exports.DistypeAdapter = DistypeAdapter;
