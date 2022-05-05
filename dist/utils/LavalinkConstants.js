"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LavalinkConstants = void 0;
/**
 * Lavalink constants.
 */
exports.LavalinkConstants = {
    /**
     * Track loading result types.
     */
    LOAD_TYPES: [`TRACK_LOADED`, `PLAYLIST_LOADED`, `SEARCH_RESULT`, `NO_MATCHES`, `LOAD_FAILED`],
    /**
     * Required permission flags for a {@link Player player} to perform certain actions.
     */
    REQUIRED_PERMISSIONS: {
        TEXT: 19456n,
        VOICE: 3146752n,
        STAGE_BECOME_SPEAKER: 4194304n,
        STAGE_REQUEST: 4294967296n
    },
    /**
     * Source identifiers for searches.
     */
    SOURCE_IDENTIFIERS: [`yt`, `sc`],
    /**
     * Valid volume range.
     */
    VOLUME: {
        MIN: 0,
        MAX: 1000,
        DEFAULT: 100
    }
};
