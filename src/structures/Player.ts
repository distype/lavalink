import { Manager } from './Manager';
import { Node } from './Node';
import { Track } from './Track';

import { LavalinkConstants } from '../utils/LavalinkConstants';

import { shuffleArray, TypedEmitter } from '@br88c/node-utils';
import { ChannelType, GatewayVoiceStateUpdateDispatchData } from 'discord-api-types/v10';
import { PermissionsUtils, Snowflake } from 'distype';

/**
 * {@link Player} events.
 */
export type PlayerEvents = {
    /**
     * When the {@link Player player} connects to the first voice channel.
     */
    VOICE_CONNECTED: (channel: Snowflake) => void
    /**
     * When the bot is moved to a different voice channel.
     */
    VOICE_MOVED: (newChannel: Snowflake) => void
    /**
     * When the {@link Player player} is destroyed.
     */
    DESTROYED: (reason: string) => void
    /**
     * When the {@link Player player} is paused.
     */
    PAUSED: () => void
    /**
     * When the {@link Player player} is resumed.
     */
    RESUMED: () => void
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track end event.
     */
    TRACK_END: (reason: string, track?: Track) => void
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track exception event.
     */
    TRACK_EXCEPTION: (message: string, severity: string, cause: string, track?: Track) => void
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track start event.
     */
    TRACK_START: (track?: Track) => void
    /**
     * Emitted when the {@link Player player}'s {@link Node node} sends a track stuck event.
     */
    TRACK_STUCK: (thresholdMs: number, track?: Track) => void
    /**
     * When the {@link Player player}'s {@link Node node} receives a voice websocket close.
     */
    WEBSOCKET_CLOSED: (code: number, reason: string, byRemote: boolean) => void
}

/**
 * Filters to apply to tracks.
 * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#using-filters)
 */
export interface PlayerFilters {
    channelMix?: {
        leftToLeft: number
        leftToRight: number
        rightToLeft: number
        rightToRight: number
    }
    distortion?: {
        sinOffset: number
        sinScale: number
        cosOffset: number
        cosScale: number
        tanOffset: number
        tanScale: number
        offset: number
        scale: number
    }
    equalizer?: Array<{ band: number, gain: number }>
    karaoke?: {
        level: number
        monoLevel: number
        filterBand: number
        filterWidth: number
    }
    lowPass?: {
        smoothing: number
    }
    rotation?: {
        rotationHz: number
    }
    timescale?: {
        speed?: number
        pitch?: number
        rate?: number
    }
    tremolo?: {
        frequency: number
        depth: number
    }
    vibrato?: {
        frequency: number
        depth: number
    }
}

/**
 * A loop type for a {@link Player player}.
 */
export type PlayerLoopType = `off` | `single` | `queue`;

/**
 * {@link Player} options.
 */
export interface PlayerOptions {
    /**
     * The amount of time to allow to connect to a VC before timing out.
     * @default 15000
     */
    connectionTimeout?: number
    /**
     * If the bot should self deafen.
     * @default true
     */
    selfDeafen?: boolean
}

/**
 * Options for playing a track with the {@link Player player}.
 */
export interface PlayerPlayOptions {
    /**
     * The number of milliseconds to offset the track by.
     * @default 0
     */
    startTime?: number
    /**
     * The number of milliseconds at which point the track should stop playing. Defaults to the track's length.
     */
    endTime?: number
    /**
     * The volume to use. Minimum value of 0, maximum value of 1000.
     * @default 100
     */
    volume?: number
    /**
     * If true, playback will be paused when the track starts. This is ignored if the bot is in the audience in a stage.
     * @default false
     */
    pause?: boolean
}

/**
 * A {@link Player player}'s state.
 */
export enum PlayerState {
    DISCONNECTED,
    CONNECTED,
    PAUSED,
    PLAYING
}

/**
 * A Lavalink player.
 */
export class Player extends TypedEmitter<PlayerEvents> {
    /**
     * The player's {@link PlayerFilters filters}.
     */
    public filters: PlayerFilters = {};
    /**
     * The player's current {@link PlayerLoopType loop behavior}.
     */
    public loop: PlayerLoopType = `off`;
    /**
     * The player's {@link Manager manager}.
     */
    public manager: Manager;
    /**
     * The player's {@link Node node}.
     */
    public node: Node;
    /**
     * The queue.
     */
    public queue: Track[] = [];
    /**
     * The current song playing, represented as an index of Player#queue. This is null if there isn't a song currently playing.
     */
    public queuePosition: number | null = null;
    /**
     * The player's {@link PlayerState state}.
     */
    public state: PlayerState = PlayerState.DISCONNECTED;
    /**
     * The current track's position. `null` if nothing is playing.
     */
    public trackPosition: number | null = null;
    /**
     * The player's voice channel.
     */
    public voiceChannel: Snowflake;
    /**
     * The player's volume.
     */
    public volume = 100;

    /**
     * The player's guild.
     */
    public readonly guild: Snowflake;
    /**
     * {@link PlayerOptions Options} for the player.
     */
    public readonly options: Required<PlayerOptions>;
    /**
     * The system string used for logging.
     */
    public readonly system: `Lavalink Player ${Snowflake}`;

    /**
     * If the bot is a speaker. Only applicable if the voice channel is a stage.
     */
    private _isSpeaker: boolean | null = null;
    /**
     * If the connected voice channel is a stage.
     */
    private _isStage: boolean | null = null;
    /**
     * A helper variable for setting the player's state after sending a play op with pause set to true.
     */
    private _sentPausedPlay: boolean | null = null;
    /**
     * If the player is connecting.
     */
    private _spinning = false;

    /**
     * Create a Lavalink player.
     * @param manager The player's {@link Manager manager}.
     * @param node The player's node.
     * @param guild The player's guild.
     * @param voiceChannel The player's voice channel.
     * @param options The player's {@link PlayerOptions options}.
     */
    constructor (manager: Manager, node: Node, guild: Snowflake, voiceChannel: Snowflake, options: PlayerOptions = {}) {
        super();

        this.manager = manager;
        this.node = node;
        this.guild = guild;
        this.voiceChannel = voiceChannel;
        this.options = {
            connectionTimeout: options.connectionTimeout ?? 15000,
            selfDeafen: options.selfDeafen ?? true
        };
        this.system = `Lavalink Player ${this.guild}`;

        this.manager.client.log(`Initialized player ${this.guild}`, {
            level: `DEBUG`, system: this.system
        });
    }

    /**
     * If the player is paused.
     */
    public get paused (): boolean {
        return this.state === PlayerState.PAUSED;
    }

    /**
     * If the player is playing a track.
     */
    public get playing (): boolean {
        return this.state === PlayerState.PLAYING;
    }

    /**
     * The current track playing.
     */
    public get currentTrack (): Track | undefined {
        return this.queuePosition !== null ? this.queue[this.queuePosition] : undefined;
    }

    /**
     * Connect to the voice channel.
     */
    public async connect (): Promise<void> {
        if (this._spinning) throw new Error(`Player is already connecting`);
        if (this.state >= PlayerState.CONNECTED) return;

        const permissions = await this.manager.client.getSelfPermissions(this.guild, this.voiceChannel);

        const voiceMissingPerms = PermissionsUtils.missingPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.VOICE);
        if (voiceMissingPerms !== 0n) {
            throw new Error(`Missing the following permissions in the voice channel: ${PermissionsUtils.toReadable(voiceMissingPerms).join(`, `)}`);
        }

        const voiceChannel = await this.manager.client.getChannelData(this.voiceChannel, `type`);

        const stageSpeakerMissingPerms = PermissionsUtils.missingPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER);
        const stageRequestMissingPerms = PermissionsUtils.missingPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_REQUEST);
        if (voiceChannel.type === ChannelType.GuildStageVoice && stageSpeakerMissingPerms !== 0n && stageRequestMissingPerms !== 0n) {
            throw new Error(`Missing the following permissions in the stage channel: ${PermissionsUtils.toReadable(stageSpeakerMissingPerms).join(`, `)} or ${PermissionsUtils.toReadable(stageRequestMissingPerms).join(`, `)}`);
        }

        this._spinning = true;
        this.manager.client.log(`Connecting to voice channel ${this.voiceChannel}`, {
            level: `DEBUG`, system: this.system
        });

        this.manager.client.gateway.updateVoiceState(this.guild, this.voiceChannel, false, this.options.selfDeafen);

        const result = await new Promise<true>((resolve, reject) => {
            const onConnected: () => Promise<void> = async () => {
                this.manager.client.log(`Connected to voice channel ${this.voiceChannel}`, {
                    level: `DEBUG`, system: this.system
                });

                if (voiceChannel.type === ChannelType.GuildStageVoice) {
                    this._isStage = true;

                    if (PermissionsUtils.hasPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER)) {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            suppress: false
                        });

                        this._isSpeaker = true;

                        this.manager.client.log(`Unsuppressed in stage`, {
                            level: `DEBUG`, system: this.system
                        });
                    } else {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            request_to_speak_timestamp: new Date().toISOString()
                        });

                        this._isSpeaker = false;

                        this.manager.client.log(`Requested to speak in stage`, {
                            level: `DEBUG`, system: this.system
                        });
                    }
                } else {
                    this._isStage = false;
                }

                this.removeListener(`DESTROYED`, onDestroy);
                if (timedOut) clearTimeout(timedOut);
                this._spinning = false;
                resolve(true);
            };

            const onDestroy = (reason: string): void => {
                this.removeListener(`VOICE_CONNECTED`, onConnected);
                if (timedOut) clearTimeout(timedOut);
                this._spinning = false;
                reject(new Error(`Failed to connect to the voice channel, Player was destroyed: ${reason}`));
            };

            const timedOut = setTimeout(() => {
                this.removeListener(`VOICE_CONNECTED`, onConnected);
                this.removeListener(`DESTROYED`, onDestroy);
                this._spinning = false;
                reject(new Error(`Timed out while connecting to the voice channel`));
            }, this.options.connectionTimeout).unref();

            this.once(`VOICE_CONNECTED`, onConnected);
            this.once(`DESTROYED`, onDestroy);
        }).catch((error) => {
            this._isSpeaker = null;
            this._isStage = null;
            this._spinning = false;
            return error;
        });

        if (result !== true) throw result;
        this.state = PlayerState.CONNECTED;
    }

    /**
     * Queue and play a track or tracks.
     * If a track is already playing, the specified track(s) will only be pushed to the queue.
     * @param track The track or track partial to queue and play.
     * @param options Play options.
     * @returns The track played.
     */
    public async play (track: Track | Track[], options?: PlayerPlayOptions): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot play when the player isn't in a connected, paused, or playing state`);

        if (track instanceof Array) {
            this.queue.push(...track);
            this.manager.client.log(`Added ${track.length} tracks to the queue`, {
                level: `DEBUG`, system: this.system
            });
        } else {
            this.queue.push(track);
            this.manager.client.log(`Added "${track.identifier}" to the queue`, {
                level: `DEBUG`, system: this.system
            });
        }

        if (this.state === PlayerState.CONNECTED) {
            const newPosition = track instanceof Array ? this.queue.length - track.length : this.queue.length - 1;
            await this._play(this.queue[newPosition], options);
            this.queuePosition = newPosition;
        }
    }

    /**
     * Destroy the player.
     * @param reason The reason the player was destroyed.
     */
    public destroy (reason = `Manual destroy`): void {
        if (this.state >= PlayerState.CONNECTED) {
            this.manager.client.gateway.updateVoiceState(this.guild, null);
        }

        this.node.send({
            op: `destroy`,
            guildId: this.guild
        }).catch((error) => {
            this.manager.client.log(`Unable to send destroy payload to node ${this.node.id}: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                level: `WARN`, system: this.system
            });
        });

        this.manager.client.log(`DESTROYED: ${reason}`, {
            level: `DEBUG`, system: this.system
        });
        this.emit(`DESTROYED`, reason);

        this.removeAllListeners();
        this.manager.players.delete(this.guild);
    }

    /**
     * Skip to the next track based on the player's loop behavior, or to a specified index of the queue.
     * @param index The index to skip to.
     */
    public async skip (index?: number): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot skip when the player isn't in a connected, paused, or playing state`);

        if (typeof index === `number`) {
            if (index < 0 || index >= this.queue.length) throw new Error(`Invalid index`);

            await this._play(this.queue[index]);
            this.queuePosition = index;

            this.manager.client.log(`Skipped to index ${index}`, {
                level: `DEBUG`, system: this.system
            });
        } else {
            await this._advanceQueue();

            this.manager.client.log(`Skipped to the next track`, {
                level: `DEBUG`, system: this.system
            });
        }
    }

    /**
     * Shuffles the queue and starts playing the first track.
     */
    public async shuffle (): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot shuffle when the player isn't in a connected, paused, or playing state`);

        await this._stop();

        this.queue = shuffleArray(this.queue);

        this.queuePosition = 0;
        await this._play(this.queue[0]);

        this.manager.client.log(`Shuffled`, {
            level: `DEBUG`, system: this.system
        });
    }

    /**
     * Seek to a desired position.
     * @param position The position in the track to seek to, in milliseconds.
     */
    public async seek (position: number): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot seek when the player isn't in a connected, paused, or playing state`);

        if (position < 0) throw new Error(`Position must be greater than 0`);

        await this.node.send({
            op: `seek`,
            guildId: this.guild,
            position
        });

        this.manager.client.log(`Seeked to ${position}ms`, {
            level: `DEBUG`, system: this.system
        });
    }

    /**
     * Pause a track.
     */
    public async pause (): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot pause when the player isn't in a connected, paused, or playing state`);

        await this.node.send({
            op: `pause`,
            guildId: this.guild,
            pause: true
        });

        this.state = PlayerState.PAUSED;
        this.manager.client.log(`PAUSED`, {
            level: `DEBUG`, system: this.system
        });
        this.emit(`PAUSED`);
    }

    /**
     * Resume a track.
     */
    public async resume (): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot resume when the player isn't in a connected, paused, or playing state`);

        await this.node.send({
            op: `pause`,
            guildId: this.guild,
            pause: false
        });

        this.state = PlayerState.PLAYING;
        this.manager.client.log(`RESUMED`, {
            level: `DEBUG`, system: this.system
        });
        this.emit(`RESUMED`);
    }

    /**
     * Stop the player.
     */
    public async stop (): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot stop when the player isn't in a connected, paused, or playing state`);

        await this._stop();

        this.queuePosition = null;
    }

    /**
     * Remove a track from the queue.
     * @param index The index of the track to remove.
     * @param advanceQueue If the queue should advance if the removed track is the current track playing. If false, the player will be stopped. Defaults to true.
     * @returns The removed track.
     */
    public async remove (index: number, advanceQueue = true): Promise<Track | undefined> {
        if (!this.queue[index]) return;

        const removedTrack = this.queue.splice(index, 1)[0];

        if (index === this.queuePosition) {
            if (advanceQueue) await this._advanceQueue();
            else await this.stop();
        }

        this.manager.client.log(`Removed track ${removedTrack.identifier}`, {
            level: `DEBUG`, system: this.system
        });

        return removedTrack;
    }

    /**
     * Clear the queue.
     * @param stop If true, if a track is currently playing it will be stopped and removed from the queue. If false, if a track is playing it will be preserved. Defaults to false.
     */
    public async clear (stop = false): Promise<void> {
        if (stop) await this.stop();
        this.queue = this.currentTrack ? [this.currentTrack] : [];
    }

    /**
     * Set the queue's loop behavior.
     * @param type The loop type to use.
     */
    public setLoop (type: PlayerLoopType): void {
        this.loop = type;
    }

    /**
     * Set the player's volume.
     * @param volume The volume to set the player to. Must be between 0 and 1000, inclusive.
     */
    public async setVolume (volume: number): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot set volume when the player isn't in a connected, paused, or playing state`);

        if (volume < LavalinkConstants.VOLUME.MIN || volume > LavalinkConstants.VOLUME.MAX) throw new Error(`Volume must be between ${LavalinkConstants.VOLUME.MIN} and ${LavalinkConstants.VOLUME.MAX}`);

        await this.node.send({
            op: `volume`,
            guildId: this.guild,
            volume
        });

        this.volume = volume;
    }

    /**
     * Set the player's filters.
     * @param filters The filters to use. An empty object clears filters.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#using-filters)
     */
    public async setFilters (filters: PlayerFilters): Promise<void> {
        if (this.state < PlayerState.CONNECTED) throw new Error(`Cannot set filters when the player isn't in a connected, paused, or playing state`);

        await this.node.send(Object.assign({
            op: `filters`,
            guildId: this.guild
        }, filters));

        this.filters = filters;
    }

    /**
     * Handle the bot being moved.
     * Only events with the bot's user ID in the player's guild should be passed to this method.
     * @param data [Voice state update](https://discord.com/developers/docs/topics/gateway#voice-state-update) data.
     * @internal
     */
    public async handleMove (data: GatewayVoiceStateUpdateDispatchData): Promise<void> {
        if (this.state === PlayerState.DISCONNECTED) {
            if (data.channel_id === this.voiceChannel) {
                this.manager.client.log(`VOICE_CONNECTED: Channel ${this.voiceChannel}`, {
                    level: `DEBUG`, system: this.system
                });
                this.emit(`VOICE_CONNECTED`, this.voiceChannel);
            } else this.destroy(`Connected to incorrect channel`);
        } else {
            if (data.channel_id === null) return this.destroy(`Disconnected from the voice channel`);

            let permissions: bigint;
            if (this.voiceChannel !== data.channel_id) {
                this.voiceChannel = data.channel_id;

                this.manager.client.log(`VOICE_MOVED: New channel ${this.voiceChannel}`, {
                    level: `DEBUG`, system: this.system
                });
                this.emit(`VOICE_MOVED`, this.voiceChannel);

                permissions = await this.manager.client.getSelfPermissions(this.guild, this.voiceChannel).catch((error) => {
                    this.destroy(`Unable to get self permissions in the new voice channel: ${(error?.message ?? error) ?? `Unknown reason`}`);
                    return -1n;
                });
                if (permissions === -1n) return;

                const channel = await this.manager.client.getChannelData(this.voiceChannel, `type`).catch((error) => {
                    this.destroy(`Unable to get data for the new voice channel: ${(error?.message ?? error) ?? `Unknown reason`}`);
                });
                if (typeof channel !== `object`) return;

                if (channel.type === ChannelType.GuildStageVoice) {
                    this._isStage = true;
                    this._isSpeaker = data.suppress;

                    const stageSpeakerMissingPerms = PermissionsUtils.missingPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER);
                    const stageRequestMissingPerms = PermissionsUtils.missingPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_REQUEST);
                    if (stageSpeakerMissingPerms !== 0n && stageRequestMissingPerms !== 0n) {
                        return this.destroy(`Missing the following permissions in the new stage channel: ${PermissionsUtils.toReadable(stageSpeakerMissingPerms).join(`, `)} or ${PermissionsUtils.toReadable(stageRequestMissingPerms).join(`, `)}`);
                    }
                } else {
                    this._isStage = false;
                    this._isSpeaker = null;
                }

                const voiceMissingPerms = PermissionsUtils.missingPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.VOICE);
                if (voiceMissingPerms !== 0n) {
                    return this.destroy(`Missing the following permissions in the voice channel: ${PermissionsUtils.toReadable(voiceMissingPerms).join(`, `)}`);
                }
            }

            if (this._isStage) {
                if (data.suppress && this._isSpeaker) {
                    this._isSpeaker = false;

                    if (!this.paused) await this.pause().catch((error) => {
                        this.manager.client.log(`Unable to pause after being suppressed: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                            level: `WARN`, system: this.system
                        });
                    });

                    permissions ??= await this.manager.client.getSelfPermissions(this.guild, this.voiceChannel).catch((error) => {
                        this.destroy(`Unable to get self permissions in the new voice channel: ${(error?.message ?? error) ?? `Unknown reason`}`);
                        return -1n;
                    });
                    if (permissions === -1n) return;

                    if (PermissionsUtils.hasPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER)) {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            suppress: false
                        })
                            .then(async () => {
                                this._isSpeaker = true;

                                if (this.paused) await this.resume().catch((error) => {
                                    this.manager.client.log(`Unable to resume after being suppressed: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                                        level: `WARN`, system: this.system
                                    });
                                });
                            })
                            .catch((error) => {
                                this.manager.client.log(`Unable to become a speaker after being suppressed in the stage: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                                    level: `WARN`, system: this.system
                                });
                            });
                    }

                    if (!this._isSpeaker && PermissionsUtils.hasPerms(permissions, ...LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_REQUEST)) {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            request_to_speak_timestamp: new Date().toISOString()
                        }).catch((error) => {
                            this.manager.client.log(`Unable to raise hand after being suppressed in the stage: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                                level: `WARN`, system: this.system
                            });
                        });
                    }
                } else if (!data.suppress && !this._isSpeaker) {
                    this._isSpeaker = true;
                    if (this.paused) await this.resume().catch((error) => {
                        this.manager.client.log(`Unable to resume after being suppressed: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                            level: `WARN`, system: this.system
                        });
                    });
                }
            }
        }
    }

    /**
     * Handle incoming payloads from the attached node.
     * @param payload The received payload.
     * @internal
     */
    public async handlePayload (payload: any): Promise<void> {
        if (payload.guildId !== this.guild) return;

        if (payload.op === `playerUpdate`) {
            this.trackPosition = payload.state.position ?? null;
        } else if (payload.op === `event`) {
            const track: Track | undefined = typeof payload.track === `string` ? (await this.manager.decodeTracks(payload.track).catch((error) => {
                this.manager.client.log(`Unable to decode track from payload: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                    level: `WARN`, system: this.system
                });
                return [];
            }))[0] : undefined;

            if (track) track.requester = this.currentTrack && this.currentTrack.track === track.track ? this.currentTrack.requester : this.queue.find((v) => v.track === track.track)?.requester;

            switch (payload.type) {
                case `TrackEndEvent`: {
                    this.trackPosition = null;
                    this.state = PlayerState.CONNECTED;

                    this.manager.client.log(`TRACK_END: ${payload.reason} (${track?.identifier})`, {
                        level: `DEBUG`, system: this.system
                    });
                    this.emit(`TRACK_END`, payload.reason, track);

                    if (payload.reason !== `STOPPED` && payload.reason !== `REPLACED`) {
                        this._advanceQueue().catch((error) => {
                            this.manager.client.log(`Unable to advance the queue: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                                level: `ERROR`, system: this.system
                            });
                        });
                    }

                    break;
                }

                case `TrackExceptionEvent`: {
                    this.manager.client.log(`TRACK_EXCEPTION: ${payload.exception.message} (Severity ${payload.exception.severity}, track ${track?.identifier}), caused by "${payload.exception.cause}"`, {
                        level: `DEBUG`, system: this.system
                    });
                    this.emit(`TRACK_EXCEPTION`, payload.exception.message, payload.exception.severity, payload.exception.cause, track);

                    break;
                }

                case `TrackStartEvent`: {
                    this.manager.client.log(`TRACK_START (${track?.identifier})`, {
                        level: `DEBUG`, system: this.system
                    });
                    this.emit(`TRACK_START`, track);

                    if (this._sentPausedPlay) {
                        this._sentPausedPlay = null;

                        this.state = PlayerState.PAUSED;
                        this.manager.client.log(`PAUSED`, {
                            level: `DEBUG`, system: this.system
                        });
                        this.emit(`PAUSED`);
                    } else this.state = PlayerState.PLAYING;

                    break;
                }

                case `TrackStuckEvent`: {
                    this.manager.client.log(`TRACK_STUCK: Threshold ${payload.thresholdMs}ms (${track?.identifier})`, {
                        level: `DEBUG`, system: this.system
                    });
                    this.emit(`TRACK_STUCK`, payload.thresholdMs, track);

                    await this._stop().catch((error) => {
                        this.manager.client.log(`Unable to stop the current track after TRACK_STUCK: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                            level: `WARN`, system: this.system
                        });
                    });

                    await this._advanceQueue().catch((error) => {
                        this.manager.client.log(`Unable to advance the queue: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                            level: `ERROR`, system: this.system
                        });
                    });

                    break;
                }

                case `WebSocketClosedEvent`: {
                    this.manager.client.log(`WEBSOCKET_CLOSED: Code ${payload.code ?? `[Unknown]`}${payload.reason?.length ? `, "${payload.reason}"` : ``}${payload.byRemove ? `, by remote` : ``}`, {
                        level: `WARN`, system: this.system
                    });
                    this.emit(`WEBSOCKET_CLOSED`, payload.code, payload.reason, payload.byRemote);

                    break;
                }
            }
        }
    }

    /**
     * Advance the queue.
     */
    private async _advanceQueue (): Promise<void> {
        if (this.state < PlayerState.CONNECTED) {
            this.manager.client.log(`Unable to advance the queue, the player isn't in a connected, paused, or playing state`, {
                level: `WARN`, system: this.system
            });
            return;
        }

        this.manager.client.log(`Advancing the queue... (Loop type: ${this.loop})`, {
            level: `DEBUG`, system: this.system
        });

        if (this.queuePosition === null) {
            this.queuePosition = 0;
        } else {
            if (this.loop !== `single`) this.queuePosition++;
            if (!this.currentTrack && this.loop === `queue`) this.queuePosition = 0;
        }

        if (this.currentTrack) {
            this._play(this.currentTrack).catch(async (error) => {
                this.manager.client.log(`Unable to play next track "${this.currentTrack?.identifier}": ${(error?.message ?? error) ?? `Unknown reason`}, skipping...`, {
                    level: `WARN`, system: this.system
                });

                if (this.loop === `single`) (this.queuePosition as number)++;
                await this._advanceQueue().catch((error) => {
                    this.manager.client.log(`Unable to advance the queue: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                        level: `ERROR`, system: this.system
                    });
                });
            });
        } else {
            if (this.state > PlayerState.CONNECTED) await this._stop().catch(() => {
                this.manager.client.log(`Unable to stop while advancing the queue to an undefined track`, {
                    level: `WARN`, system: this.system
                });
            });
            this.queuePosition = null;

            this.manager.client.log(`Reached end of the queue`, {
                level: `DEBUG`, system: this.system
            });
        }
    }

    /**
     * Helper function for sending play payloads to the server.
     * @param track The track to play.
     * @param options Options to use in the play payload.
     */
    private async _play (track: Track, options?: PlayerPlayOptions): Promise<void> {
        if (this.state !== PlayerState.CONNECTED && this.state !== PlayerState.PAUSED && this.state !== PlayerState.PLAYING) throw new Error(`Cannot play when the player isn't in a connected, paused, or playing state`);

        if (typeof options?.volume === `number`) {
            if (options.volume < LavalinkConstants.VOLUME.MIN || options.volume > LavalinkConstants.VOLUME.MAX) throw new Error(`Volume must be between ${LavalinkConstants.VOLUME.MIN} and ${LavalinkConstants.VOLUME.MAX}`);
            this.volume = options.volume;
            if (options.volume === LavalinkConstants.VOLUME.DEFAULT) delete options.volume;
        } else if (this.volume !== LavalinkConstants.VOLUME.DEFAULT) options = Object.assign(options ?? {}, { volume: this.volume });

        if (this._isStage && !this._isSpeaker) options = Object.assign(options ?? {}, { pause: true });

        if (options?.pause) this._sentPausedPlay = true;

        await this.node.send(Object.assign({
            op: `play`,
            guildId: this.guild,
            track: track.track
        }, options));

        this.manager.client.log(`Playing ${track.identifier}`, {
            level: `DEBUG`, system: this.system
        });
    }

    /**
     * Helper function for sending stop payloads to the server.
     */
    private async _stop (): Promise<void> {
        await this.node.send({
            op: `stop`,
            guildId: this.guild
        });

        this.trackPosition = null;
        this.state = PlayerState.CONNECTED;
    }
}
