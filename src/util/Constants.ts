export default {
    SOURCE_IDENTIFIERS: {
        youtube: `yt`,
        soundcloud: `sc`
    },
    SPOTIFY_REGEX: /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(track|playlist|album)[/:]([A-Za-z0-9]+)/,
    SPOTIFY_BASE_URL: `https://api.spotify.com/v1`,
    SPOTIFY_TOKEN_ENDPOINT: `https://accounts.spotify.com/api/token`,
    TEXT_REQUIRED_PERMISSIONS: [`EMBED_LINKS`, `SEND_MESSAGES`, `VIEW_CHANNEL`],
    URL_REGEX: /^https?:\/\//,
    VOICE_REQUIRED_PERMISSIONS: [`CONNECT`, `SPEAK`, `VIEW_CHANNEL`]
};
