"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    /**
     * Create a lavalink player.
     * @param manager The player's {@link Manager manager}.
     * @param node The player's node.
     * @param options The player's {@link PlayerOptions options}.
     * @param logCallback A {@link LogCallback callback} to be used for logging events internally in the player.
     * @param logThisArg A value to use as `this` in the `logCallback`.
     */
    constructor(manager, node, options, logCallback = () => { }, logThisArg) {
        this.manager = manager;
        this.node = node;
        this.options = {
            becomeSpeaker: options.becomeSpeaker ?? true,
            connectionTimeout: options.connectionTimeout ?? 15000,
            guildId: options.guildId,
            selfDeafen: options.selfDeafen ?? true,
            selfMute: options.selfMute ?? false,
            textChannelId: options.textChannelId,
            voiceChannelId: options.voiceChannelId
        };
        this.system = `Lavalink Player ${options.guildId}`;
        this._log = logCallback.bind(logThisArg);
        this._log(`Initialized player ${options.guildId}`, {
            level: `DEBUG`, system: this.system
        });
    }
}
exports.Player = Player;
