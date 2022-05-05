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
        readonly TEXT: 19456n;
        readonly VOICE: 3146752n;
        readonly STAGE_BECOME_SPEAKER: 4194304n;
        readonly STAGE_REQUEST: 4294967296n;
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
