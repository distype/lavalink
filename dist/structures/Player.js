"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = exports.PlayerState = void 0;
const LavalinkConstants_1 = require("../utils/LavalinkConstants");
const node_utils_1 = require("@br88c/node-utils");
const v10_1 = require("discord-api-types/v10");
const v4_1 = require("discord-api-types/voice/v4");
const distype_1 = require("distype");
/**
 * A {@link Player player}'s state.
 */
var PlayerState;
(function (PlayerState) {
    PlayerState[PlayerState["DISCONNECTED"] = 0] = "DISCONNECTED";
    PlayerState[PlayerState["CONNECTED"] = 1] = "CONNECTED";
    PlayerState[PlayerState["PAUSED"] = 2] = "PAUSED";
    PlayerState[PlayerState["PLAYING"] = 3] = "PLAYING";
})(PlayerState = exports.PlayerState || (exports.PlayerState = {}));
class Player extends node_utils_1.TypedEmitter {
    /**
     * Create a lavalink player.
     * @param manager The player's {@link Manager manager}.
     * @param node The player's node.
     * @param guild The player's guild.
     * @param textChannel The player's text channel.
     * @param voiceChannel The player's voice channel.
     * @param options The player's {@link PlayerOptions options}.
     * @param logCallback A {@link LogCallback callback} to be used for logging events internally in the player.
     * @param logThisArg A value to use as `this` in the `logCallback`.
     */
    constructor(manager, node, guild, textChannel, voiceChannel, options = {}, logCallback = () => { }, logThisArg) {
        super();
        /**
         * The player's {@link PlayerFilters filters}.
         */
        this.filters = {};
        /**
         * The player's current {@link PlayerLoopType loop behavior}.
         */
        this.loop = `off`;
        /**
         * The queue.
         */
        this.queue = [];
        /**
         * The current song playing, represented as an index of Player#queue. This is null if there isn't a song currently playing.
         */
        this.queuePosition = null;
        /**
         * The player's {@link PlayerState state}.
         */
        this.state = PlayerState.DISCONNECTED;
        /**
         * The current track's position. `null` if nothing is playing.
         */
        this.trackPosition = null;
        /**
         * The player's volume.
         */
        this.volume = 100;
        /**
         * If the bot is a speaker. Only applicable if the voice channel is a stage.
         */
        this._isSpeaker = null;
        /**
         * If the connected voice channel is a stage.
         */
        this._isStage = null;
        /**
         * A helper variable for setting the player's state after sending a play op with pause set to true.
         */
        this._sentPausedPlay = null;
        /**
         * If the player is connecting.
         */
        this._spinning = false;
        this.manager = manager;
        this.node = node;
        this.guild = guild;
        this.textChannel = textChannel;
        this.voiceChannel = voiceChannel;
        this.options = {
            connectionTimeout: options.connectionTimeout ?? 15000,
            selfDeafen: options.selfDeafen ?? true
        };
        this.system = `Lavalink Player ${this.guild}`;
        this._log = logCallback.bind(logThisArg);
        this._log(`Initialized player ${this.guild}`, {
            level: `DEBUG`, system: this.system
        });
    }
    /**
     * If the player is paused.
     */
    get paused() {
        return this.state === PlayerState.PAUSED;
    }
    /**
     * If the player is playing a track.
     */
    get playing() {
        return this.state === PlayerState.PLAYING;
    }
    /**
     * The current track playing.
     */
    get currentTrack() {
        return this.queuePosition !== null ? this.queue[this.queuePosition] : undefined;
    }
    /**
     * Connect to the voice channel.
     */
    async connect() {
        if (this._spinning)
            throw new Error(`Player is already connecting`);
        if (this.state >= PlayerState.CONNECTED)
            return;
        const permissions = await this.manager.client.getSelfPermissions(this.guild, this.voiceChannel);
        if (!distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.VOICE)) {
            throw new Error(`Missing one of the following permissions to join the voice channel: "${distype_1.PermissionsUtils.toReadable(LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.VOICE).join(`, `)}"`);
        }
        const voiceChannel = await this.manager.client.getChannelData(this.voiceChannel, `type`);
        if (voiceChannel.type === v10_1.ChannelType.GuildStageVoice && !distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER) && !distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_REQUEST)) {
            throw new Error(`Missing one of the following permissions to join the stage channel: "${distype_1.PermissionsUtils.toReadable(LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER).join(`, `)}" or "${distype_1.PermissionsUtils.toReadable(LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_REQUEST).join(`, `)}"`);
        }
        this._spinning = true;
        this._log(`Connecting to voice channel ${this.voiceChannel}`, {
            level: `DEBUG`, system: this.system
        });
        this.manager.client.gateway.updateVoiceState(this.guild, this.voiceChannel, false, this.options.selfDeafen);
        const result = await new Promise((resolve, reject) => {
            const onConnected = async () => {
                this._log(`Connected to voice channel ${this.voiceChannel}`, {
                    level: `DEBUG`, system: this.system
                });
                if (voiceChannel.type === v10_1.ChannelType.GuildStageVoice) {
                    this._isStage = true;
                    if (distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER)) {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            suppress: false
                        });
                        this._isSpeaker = true;
                        this._log(`Unsuppressed in stage`, {
                            level: `DEBUG`, system: this.system
                        });
                    }
                    else {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            request_to_speak_timestamp: new Date().toISOString()
                        });
                        this._isSpeaker = false;
                        this._log(`Requested to speak in stage`, {
                            level: `DEBUG`, system: this.system
                        });
                    }
                }
                else {
                    this._isStage = false;
                }
                this.removeListener(`DESTROYED`, onDestroy);
                if (timedOut)
                    clearTimeout(timedOut);
                this._spinning = false;
                resolve(true);
            };
            const onDestroy = (reason) => {
                this.removeListener(`VOICE_CONNECTED`, onConnected);
                if (timedOut)
                    clearTimeout(timedOut);
                this._spinning = false;
                reject(new Error(`Failed to connect to the voice channel, Player was destroyed: ${reason}`));
            };
            const timedOut = setTimeout(() => {
                this.removeListener(`VOICE_CONNECTED`, onConnected);
                this.removeListener(`DESTROYED`, onDestroy);
                this._spinning = false;
                reject(new Error(`Timed out while connecting to the voice channel`));
            }, this.options.connectionTimeout);
            this.once(`VOICE_CONNECTED`, onConnected);
            this.once(`DESTROYED`, onDestroy);
        }).catch((error) => {
            this._isSpeaker = null;
            this._isStage = null;
            this._spinning = false;
            return error;
        });
        if (result !== true)
            throw result;
    }
    /**
     * Queue and play a track or tracks.
     * If a track is already playing, the specified track(s) will only be pushed to the queue.
     * @param track The track or track partial to queue and play.
     * @param options Play options.
     * @returns The track played.
     */
    async play(track, options) {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot play when the player isn't in a connected, paused, or playing state`);
        if (track instanceof Array) {
            this.queue.push(...track);
            this._log(`Added ${track.length} tracks to the queue`, {
                level: `DEBUG`, system: this.system
            });
        }
        else {
            this.queue.push(track);
            this._log(`Added "${track.identifier}" to the queue`, {
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
    destroy(reason = `Manual destroy`) {
        if (this.state >= PlayerState.CONNECTED) {
            this.manager.client.gateway.updateVoiceState(this.guild, null);
        }
        this.node.send({
            op: `destroy`,
            guildId: this.guild
        }).catch((error) => {
            this._log(`Unable to send destroy payload to node ${this.node.id}: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                level: `WARN`, system: this.system
            });
        });
        this.emit(`DESTROYED`, reason);
        this._log(`DESTROYED: ${reason}`, {
            level: `DEBUG`, system: this.system
        });
        this.removeAllListeners();
        this.manager.players.delete(this.guild);
    }
    /**
     * Skip to the next track based on the player's loop behavior, or to a specified index of the queue.
     * @param index The index to skip to.
     */
    async skip(index) {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot skip when the player isn't in a connected, paused, or playing state`);
        await this._stop();
        if (typeof index === `number`) {
            if (index < 0 || index >= this.queue.length)
                throw new Error(`Invalid index`);
            await this._play(this.queue[index]);
            this.queuePosition = index;
            this._log(`Skipped to index ${index}`, {
                level: `DEBUG`, system: this.system
            });
        }
        else {
            await this._advanceQueue();
            this._log(`Skipped to the next track`, {
                level: `DEBUG`, system: this.system
            });
        }
    }
    /**
     * Shuffles the queue and starts playing the first track.
     */
    async shuffle() {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot shuffle when the player isn't in a connected, paused, or playing state`);
        await this._stop();
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        this.queuePosition = 0;
        await this._play(this.queue[0]);
        this._log(`Shuffled`, {
            level: `DEBUG`, system: this.system
        });
    }
    /**
     * Seek to a desired position.
     * @param position The position in the track to seek to, in milliseconds.
     */
    async seek(position) {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot seek when the player isn't in a connected, paused, or playing state`);
        if (position < 0)
            throw new Error(`Position must be greater than 0`);
        await this.node.send({
            op: `seek`,
            guildId: this.guild,
            position
        });
        this._log(`Seeked to ${position}ms`, {
            level: `DEBUG`, system: this.system
        });
    }
    /**
     * Pause a track.
     */
    async pause() {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot pause when the player isn't in a connected, paused, or playing state`);
        await this.node.send({
            op: `pause`,
            guildId: this.guild,
            pause: true
        });
        this.state = PlayerState.PAUSED;
        this.emit(`PAUSED`);
        this._log(`PAUSED`, {
            level: `DEBUG`, system: this.system
        });
    }
    /**
     * Resume a track.
     */
    async resume() {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot resume when the player isn't in a connected, paused, or playing state`);
        await this.node.send({
            op: `pause`,
            guildId: this.guild,
            pause: false
        });
        this.state = PlayerState.PLAYING;
        this.emit(`RESUMED`);
        this._log(`RESUMED`, {
            level: `DEBUG`, system: this.system
        });
    }
    /**
     * Stop the player.
     */
    async stop() {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot stop when the player isn't in a connected, paused, or playing state`);
        await this._stop();
        this.queuePosition = null;
    }
    /**
     * Remove a track from the queue.
     * @param index The index of the track to remove.
     * @param advanceQueue If the queue should advance if the removed track is the current track playing. If false, the player will be stopped. Defaults to true.
     * @returns The removed track.
     */
    async remove(index, advanceQueue = true) {
        if (!this.queue[index])
            return;
        const removedTrack = this.queue.splice(index, 1)[0];
        if (index === this.queuePosition) {
            if (advanceQueue)
                await this._advanceQueue();
            else
                await this.stop();
        }
        this._log(`Removed track ${removedTrack.identifier}`, {
            level: `DEBUG`, system: this.system
        });
        return removedTrack;
    }
    /**
     * Clear the queue.
     * @param stop If true, if a track is currently playing it will be stopped and removed from the queue. If false, if a track is playing it will be preserved. Defaults to false.
     */
    async clear(stop = false) {
        if (stop)
            await this.stop();
        this.queue = this.currentTrack ? [this.currentTrack] : [];
    }
    /**
     * Set the queue's loop behavior.
     * @param type The loop type to use.
     */
    setLoop(type) {
        this.loop = type;
    }
    /**
     * Set the player's volume.
     * @param volume The volume to set the player to. Must be between 0 and 1000, inclusive.
     */
    async setVolume(volume) {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot set volume when the player isn't in a connected, paused, or playing state`);
        if (volume < 0 || volume > 1000)
            throw new Error(`Volume must be between 0 and 1000`);
        await this.node.send({
            op: `volume`,
            guildId: this.volume,
            volume
        });
        this.volume = volume;
    }
    /**
     * Set the player's filters.
     * @param filters The filters to use. An empty object clears filters.
     * @see [Lavalink Docs](https://github.com/freyacodes/Lavalink/blob/dev/IMPLEMENTATION.md#using-filters)
     */
    async setFilters(filters) {
        if (this.state < PlayerState.CONNECTED)
            throw new Error(`Cannot set filters when the player isn't in a connected, paused, or playing state`);
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
    async handleMove(data) {
        if (this.state === PlayerState.DISCONNECTED) {
            if (data.channel_id === this.voiceChannel) {
                this.state = PlayerState.CONNECTED;
                this.emit(`VOICE_CONNECTED`, this.voiceChannel);
                this._log(`VOICE_CONNECTED: Channel ${this.voiceChannel}`, {
                    level: `DEBUG`, system: this.system
                });
            }
            else
                this.destroy(`Connected to incorrect channel`);
        }
        else {
            if (data.channel_id === null)
                return this.destroy(`Disconnected from the voice channel`);
            let permissions;
            if (this.voiceChannel !== data.channel_id) {
                this.voiceChannel = data.channel_id;
                this.emit(`VOICE_MOVED`, this.voiceChannel);
                this._log(`VOICE_MOVED: New channel ${this.voiceChannel}`, {
                    level: `DEBUG`, system: this.system
                });
                permissions = await this.manager.client.getSelfPermissions(this.guild, this.voiceChannel);
                if ((await this.manager.client.getChannelData(this.voiceChannel, `type`)).type === v10_1.ChannelType.GuildStageVoice) {
                    this._isStage = true;
                    this._isSpeaker = data.suppress;
                    if (!distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER) && !distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_REQUEST)) {
                        return this.destroy(`Missing one of the following permissions in the new stage channel: "${distype_1.PermissionsUtils.toReadable(LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER).join(`, `)}" or "${distype_1.PermissionsUtils.toReadable(LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_REQUEST).join(`, `)}"`);
                    }
                }
                else {
                    this._isStage = false;
                    this._isSpeaker = null;
                }
                if (!distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.VOICE)) {
                    return this.destroy(`Missing one of the following permissions in the new voice channel: "${distype_1.PermissionsUtils.toReadable(LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.VOICE).join(`, `)}"`);
                }
            }
            if (this._isStage) {
                if (data.suppress && this._isSpeaker) {
                    await this.pause();
                    permissions ??= await this.manager.client.getSelfPermissions(this.guild, this.voiceChannel);
                    if (distype_1.PermissionsUtils.hasPerm(permissions, LavalinkConstants_1.LavalinkConstants.REQUIRED_PERMISSIONS.STAGE_BECOME_SPEAKER)) {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            suppress: false
                        });
                        this._isSpeaker = true;
                    }
                    else {
                        await this.manager.client.rest.modifyCurrentUserVoiceState(this.guild, {
                            channel_id: this.voiceChannel,
                            request_to_speak_timestamp: new Date().toISOString()
                        });
                        this._isSpeaker = false;
                    }
                }
                else if (!data.suppress && !this._isSpeaker) {
                    this._isSpeaker = true;
                    this.resume();
                }
            }
        }
    }
    /**
     * Handle incoming payloads from the attached node.
     * @param payload The received payload.
     * @internal
     */
    async handlePayload(payload) {
        if (payload.guildId !== this.guild)
            return;
        if (payload.op === `playerUpdate`) {
            this.trackPosition = payload.state.position ?? null;
        }
        else if (payload.op === `event`) {
            const track = (typeof payload.track === `string` ? (await this.manager.decodeTracks(payload.track).catch((error) => {
                this._log(`Unable to decode track from payload: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                    level: `WARN`, system: this.system
                });
                return [];
            })) : [])[0];
            if (track)
                track.requester = this.currentTrack && this.currentTrack.track === track.track ? this.currentTrack.requester : this.queue.find((v) => v.track === track.track)?.requester;
            switch (payload.type) {
                case `TrackEndEvent`: {
                    this.trackPosition = null;
                    this.state = PlayerState.CONNECTED;
                    this.emit(`TRACK_END`, payload.reason, track);
                    this._log(`TRACK_END: ${payload.reason} (${track.identifier})`, {
                        level: `DEBUG`, system: this.system
                    });
                    if (payload.reason !== `STOPPED` && payload.reason !== `REPLACED`) {
                        this._advanceQueue().catch((error) => {
                            this._log(`Unable to advance the queue: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                                level: `ERROR`, system: this.system
                            });
                        });
                    }
                    break;
                }
                case `TrackExceptionEvent`: {
                    this.emit(`TRACK_EXCEPTION`, payload.exception.message, payload.exception.severity, payload.exception.cause, track);
                    this._log(`TRACK_EXCEPTION: ${payload.exception.message} (Severity ${payload.exception.severity}, track ${track.identifier}), caused by "${payload.exception.cause}"`, {
                        level: `DEBUG`, system: this.system
                    });
                    break;
                }
                case `TrackStartEvent`: {
                    if (this._sentPausedPlay) {
                        this.state = PlayerState.PAUSED;
                        this._sentPausedPlay = null;
                    }
                    else
                        this.state = PlayerState.PLAYING;
                    this.emit(`TRACK_START`, track);
                    this._log(`TRACK_START (${track.identifier})`, {
                        level: `DEBUG`, system: this.system
                    });
                    break;
                }
                case `TrackStuckEvent`: {
                    this.emit(`TRACK_STUCK`, payload.thresholdMs, track);
                    this._log(`TRACK_END: Threshold ${payload.thresholdMs}ms (${track.identifier})`, {
                        level: `DEBUG`, system: this.system
                    });
                    await this._stop().catch((error) => {
                        this._log(`Unable to stop the current track after TRACK_STUCK: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                            level: `WARN`, system: this.system
                        });
                    });
                    await this._advanceQueue().catch((error) => {
                        this._log(`Unable to advance the queue: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                            level: `ERROR`, system: this.system
                        });
                    });
                    break;
                }
                case `WebSocketClosedEvent`: {
                    if (payload.code !== v4_1.VoiceCloseCodes.Disconnected) {
                        this.emit(`WEBSOCKET_CLOSED`, payload.code, payload.reason, payload.byRemote);
                        this._log(`WEBSOCKET_CLOSED: Code ${payload.code}, "${payload.reason}"${payload.byRemove ? `, by remote` : ``}`, {
                            level: `DEBUG`, system: this.system
                        });
                        this.destroy(`Disconnected with code ${payload.code}: "${payload.reason}"`);
                    }
                    break;
                }
            }
        }
    }
    /**
     * Advance the queue.
     */
    async _advanceQueue() {
        if (this.state < PlayerState.CONNECTED) {
            this._log(`Unable to advance the queue, the player isn't in a connected, paused, or playing state`, {
                level: `WARN`, system: this.system
            });
            return;
        }
        this._log(`Advancing the queue... (Loop type: ${this.loop})`, {
            level: `DEBUG`, system: this.system
        });
        if (this.queuePosition === null) {
            this.queuePosition = 0;
        }
        else {
            if (this.loop !== `single`)
                this.queuePosition++;
            if (!this.currentTrack && this.loop === `queue`)
                this.queuePosition = 0;
        }
        if (this.currentTrack) {
            this._play(this.currentTrack).catch(async (error) => {
                this._log(`Unable to play next track "${this.currentTrack?.identifier}": ${(error?.message ?? error) ?? `Unknown reason`}, skipping...`, {
                    level: `WARN`, system: this.system
                });
                if (this.loop === `single`)
                    this.queuePosition++;
                await this._advanceQueue().catch((error) => {
                    this._log(`Unable to advance the queue: ${(error?.message ?? error) ?? `Unknown reason`}`, {
                        level: `ERROR`, system: this.system
                    });
                });
            });
        }
        else {
            if (this.state > PlayerState.CONNECTED)
                await this._stop().catch(() => {
                    this._log(`Unable to stop while advancing the queue to an undefined track`, {
                        level: `WARN`, system: this.system
                    });
                });
            this.queuePosition = null;
            this._log(`Reached end of the queue`, {
                level: `DEBUG`, system: this.system
            });
        }
    }
    /**
     * Helper function for sending play payloads to the server.
     * @param track The track to play.
     * @param options Options to use in the play payload.
     */
    async _play(track, options) {
        if (this.state !== PlayerState.CONNECTED && this.state !== PlayerState.PAUSED && this.state !== PlayerState.PLAYING)
            throw new Error(`Cannot play when the player isn't in a connected, paused, or playing state`);
        if (typeof options?.volume === `number`) {
            if (options.volume < 0 || options.volume > 1000)
                throw new Error(`Volume must be between 0 and 1000`);
            this.volume = options.volume;
            if (options.volume === 100)
                delete options.volume;
        }
        else if (this.volume !== 100)
            options = Object.assign(options ?? {}, { volume: this.volume });
        if (this._isStage && !this._isSpeaker)
            options = Object.assign(options ?? {}, { pause: true });
        if (options?.pause)
            this._sentPausedPlay = true;
        await this.node.send(Object.assign({
            op: `play`,
            guildId: this.guild,
            track: track.track
        }, options));
        this._log(`Playing ${track.identifier}`, {
            level: `DEBUG`, system: this.system
        });
    }
    /**
     * Helper function for sending stop payloads to the server.
     */
    async _stop() {
        await this.node.send({
            op: `stop`,
            guildId: this.guild
        });
        this.trackPosition = null;
        this.state = PlayerState.CONNECTED;
    }
}
exports.Player = Player;
