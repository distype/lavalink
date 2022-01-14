import { BaseAdapter, Permissions } from './BaseAdapter';
import { LavalinkManager } from '../typings/lib';
import { Client } from 'discord.js';
import { GatewayVoiceStateUpdateData, RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody, Snowflake } from 'discord-api-types/v9';
export declare class DiscordjsAdapter extends BaseAdapter {
    client: Client;
    constructor(client: Client);
    bind(manager: LavalinkManager): void;
    getBotId(): Snowflake;
    getGuildShardSessionId(guildId: Snowflake): string;
    hasPerms(guildId: Snowflake, channelId?: Snowflake): Promise<Permissions>;
    isStage(channelId: Snowflake): Promise<boolean>;
    modifyCurrentUserVoiceState(guildId: Snowflake, data: RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody): Promise<void>;
    updateVoiceState(data: GatewayVoiceStateUpdateData): void;
}
