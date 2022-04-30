"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Track = void 0;
/**
 * A track.
 */
class Track {
    /**
     * Create a new track.
     * @param data Track data from the server.
     * @param requester The track's requester. This value can be anything, and solely exists for your convenience.
     */
    constructor(data, requester) {
        this.track = data.track;
        this.identifier = data.info.identifier;
        this.author = data.info.author;
        this.length = data.info.length;
        this.isStream = data.info.isStream;
        this.position = data.info.position;
        this.title = data.info.title;
        this.uri = data.info.uri;
        this.sourceName = data.info.sourceName;
        this.requester = requester;
    }
    /**
     * Get the track's thumbnail. This is only supported by tracks with sourceName = 'youtube'.
     * @param resolution The thumbnail resolution.
     * @returns The track's thumbnail, if available.
     */
    thumbnail(resolution) {
        if (this.sourceName === `youtube`)
            return `https://img.youtube.com/vi/${this.identifier}/${resolution}.jpg`;
        else
            return undefined;
    }
}
exports.Track = Track;
