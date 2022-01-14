import { BaseAdapter, Permissions } from './BaseAdapter';
import { LavalinkManager } from '../typings/lib';
import { GatewayVoiceStateUpdateData, RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody, Snowflake } from 'discord-api-types/v9';
import { Client } from 'distype';
export declare class DistypeAdapter extends BaseAdapter {
    client: Client;
    constructor(client: Client);
    bind(manager: LavalinkManager): void;
    getBotId(): Snowflake;
    getGuildShardSessionId(guildId: Snowflake): string;
    hasPerms(guildId: Snowflake, channelId?: Snowflake): Promise<Permissions>;
    isStage(channelId: Snowflake): Promise<boolean>;
    modifyCurrentUserVoiceState(guildId: Snowflake, data: RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody): Promise<void>;
    updateVoiceState(data: GatewayVoiceStateUpdateData): Promise<void>;
}
