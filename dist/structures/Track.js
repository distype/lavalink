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
        this.identifier = data.identifier;
        this.isSeekable = data.isSeekable;
        this.author = data.author;
        this.length = data.length;
        this.isStream = data.isStream;
        this.position = data.position;
        this.title = data.title;
        this.uri = data.uri;
        this.sourceName = data.sourceName;
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
