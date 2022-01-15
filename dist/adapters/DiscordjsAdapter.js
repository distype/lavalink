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
exports.DiscordjsAdapter = void 0;
const BaseAdapter_1 = require("./BaseAdapter");
class DiscordjsAdapter extends BaseAdapter_1.BaseAdapter {
    constructor(client) {
        super();
        this.client = client;
    }
    bind(manager) {
        this.client.ws.on(`VOICE_SERVER_UPDATE`, (data) => void manager._handleVoiceUpdate(`VOICE_SERVER_UPDATE`, data));
        this.client.ws.on(`VOICE_STATE_UPDATE`, (data) => void manager._handleVoiceUpdate(`VOICE_STATE_UPDATE`, data));
    }
    getBotId() {
        if (!this.client.user)
            throw new Error(`Gateway has not received a payload with a self user`);
        return this.client.user.id;
    }
    async getGuildShardSessionId(guildId) {
        const sessionId = (this.client.guilds.cache.get(guildId) ?? await this.client.guilds.fetch(guildId)).shard.sessionId;
        if (!sessionId)
            throw new Error(`Guild shard has not received session ID`);
        return sessionId;
    }
    async hasPerms(guildId, channelId) {
        const me = (this.client.guilds.cache.get(guildId) ?? await this.client.guilds.fetch(guildId)).me;
        const perms = channelId ? me?.permissionsIn(channelId) : me?.permissions;
        if (!perms)
            throw new Error(`Unable to get permissions`);
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
    async isStage(channelId) {
        const channel = (this.client.channels.cache.get(channelId) ?? await this.client.channels.fetch(channelId));
        if (!channel)
            throw new Error(`Unable to check if channel is a stage`);
        return channel.type === `GUILD_STAGE_VOICE`;
    }
    async modifyCurrentUserVoiceState(guildId, data) {
        const voiceState = (this.client.guilds.cache.get(guildId) ?? await this.client.guilds.fetch(guildId)).voiceStates.cache.get(data.channel_id);
        if (!voiceState)
            throw new Error(`Unable to fetch the voice state to modify`);
        if (typeof data.suppress === `boolean`)
            voiceState.setSuppressed(data.suppress);
        if (data.request_to_speak_timestamp !== undefined) {
            const timeout = data.request_to_speak_timestamp !== null ? new Date(data.request_to_speak_timestamp).valueOf() - Date.now() : 0;
            if (timeout > 0)
                new Promise((resolve) => setTimeout(resolve, timeout));
            voiceState.setRequestToSpeak(data.request_to_speak_timestamp !== null);
        }
    }
    async updateVoiceState(data) {
        // @ts-expect-error Cannot find module 'discord.js' or its corresponding type declarations.
        const { ShardClientUtil } = await Promise.resolve().then(() => __importStar(require(`discord.js`)));
        if (typeof this.client.shard?.count !== `number`)
            throw new Error(`Unable to get shard count`);
        const shard = this.client.ws.shards.get(ShardClientUtil.shardIdForGuildId(data.guild_id, this.client.shard.count));
        if (!shard)
            throw new Error(`Unable to get shard to send voice state update`);
        shard.send(data);
    }
}
exports.DiscordjsAdapter = DiscordjsAdapter;
