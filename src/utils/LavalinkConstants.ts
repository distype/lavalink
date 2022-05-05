/**
 * Lavalink constants.
 */
export const LavalinkConstants = {
    /**
     * Track loading result types.
     */
    LOAD_TYPES: [`TRACK_LOADED`, `PLAYLIST_LOADED`, `SEARCH_RESULT`, `NO_MATCHES`, `LOAD_FAILED`],
    /**
     * Required permission flags for a {@link Player player} to perform certain actions.
     */
    REQUIRED_PERMISSIONS: {
        TEXT: [`VIEW_CHANNEL`, `SEND_MESSAGES`, `EMBED_LINKS`],
        VOICE: [`VIEW_CHANNEL`, `CONNECT`, `SPEAK`],
        VOICE_MOVED: [`SPEAK`],
        STAGE_BECOME_SPEAKER: [`MUTE_MEMBERS`],
        STAGE_REQUEST: [`REQUEST_TO_SPEAK`]
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
} as const;
