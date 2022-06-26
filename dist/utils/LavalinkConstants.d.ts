/**
 * Lavalink constants.
 */
export declare const LavalinkConstants: {
    /**
     * Track loading result types.
     */
    readonly LOAD_TYPES: readonly ["TRACK_LOADED", "PLAYLIST_LOADED", "SEARCH_RESULT", "NO_MATCHES", "LOAD_FAILED"];
    /**
     * Required permission flags for a {@link Player player} to perform certain actions.
     */
    readonly REQUIRED_PERMISSIONS: {
        readonly VOICE: readonly ["VIEW_CHANNEL", "CONNECT", "SPEAK"];
        readonly VOICE_MOVED: readonly ["SPEAK"];
        readonly STAGE_BECOME_SPEAKER: readonly ["MUTE_MEMBERS"];
        readonly STAGE_REQUEST: readonly ["REQUEST_TO_SPEAK"];
    };
    /**
     * Source identifiers for searches.
     */
    readonly SOURCE_IDENTIFIERS: readonly ["yt", "sc"];
    /**
     * Valid volume range.
     */
    readonly VOLUME: {
        readonly MIN: 0;
        readonly MAX: 1000;
        readonly DEFAULT: 100;
    };
};
