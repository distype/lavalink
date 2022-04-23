"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LavalinkConstants = void 0;
exports.LavalinkConstants = {
    SOURCE_IDENTIFIERS: {
        youtube: `yt`,
        soundcloud: `sc`
    },
    REQUIRED_PERMISSIONS: {
        TEXT: [`EMBED_LINKS`, `SEND_MESSAGES`, `VIEW_CHANNEL`],
        VOICE: [`CONNECT`, `SPEAK`, `VIEW_CHANNEL`]
    },
    URL_REGEX: /^https?:\/\//
};
