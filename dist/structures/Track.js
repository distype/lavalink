"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Track = void 0;
/**
 * A track.
 */
class Track {
    /**
     * The track's requester.
     * This value can be anything, and solely exists for your convenience.
     */
    requester;
    /**
     * The track encoded into base64.
     */
    track;
    /**
     * The track's identifier.
     */
    identifier;
    /**
     * If the track is seekable.
     */
    isSeekable;
    /**
     * The track's author.
     */
    author;
    /**
     * The length of the track in milliseconds.
     */
    length;
    /**
     * If the track is a stream.
     */
    isStream;
    /**
     * The current position in the track, in milliseconds.
     */
    position;
    /**
     * The track's title.
     */
    title;
    /**
     * The track's URI.
     */
    uri;
    /**
     * The name of the track's source.
     */
    sourceName;
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
