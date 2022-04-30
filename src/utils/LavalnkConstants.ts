export const LavalinkConstants = {
    LOAD_TYPES: [`TRACK_LOADED`, `PLAYLIST_LOADED`, `SEARCH_RESULT`, `NO_MATCHES`, `LOAD_FAILED`],
    REQUIRED_PERMISSIONS: {
        TEXT: 19456n,
        VOICE: 3146752n,
        STAGE_BECOME_SPEAKER: 4194304n,
        STAGE_REQUEST: 4294967296n
    },
    SOURCE_IDENTIFIERS: [`yt`, `sc`],
    URL_REGEX: /^https?:\/\//
} as const;
