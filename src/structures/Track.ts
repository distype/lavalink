/**
 * Track data received from the server.
 * This is used internally when creating the Track class, and is not easily accessible by the user.
 * @internal
 */
export interface TrackData {
    /**
     * The base64 encoded track.
     */
    readonly track: string
    /**
     * The track's identifier.
     */
    readonly identifier: string
    /**
     * If the track is seekable.
     */
    readonly isSeekable: boolean
    /**
     * The track's author.
     */
    readonly author: string
    /**
     * The length of the track in milliseconds.
     */
    readonly length: number
    /**
     * If the track is a stream.
     */
    readonly isStream: boolean
    /**
     * The current position in the track, in milliseconds.
     */
    readonly position: number
    /**
     * The track's title.
     */
    readonly title: string
    /**
     * The track's URI.
     */
    readonly uri: string
    /**
     * The name of the track's source.
     */
    readonly sourceName: string
}

/**
 * A track.
 */
export class Track implements TrackData {
    /**
     * The track's requester.
     * This value can be anything, and solely exists for your convenience.
     */
    public requester?: string;

    /**
     * The track encoded into base64.
     */
    public readonly track: string;
    /**
     * The track's identifier.
     */
    public readonly identifier: string;
    /**
     * If the track is seekable.
     */
    readonly isSeekable: boolean;
    /**
     * The track's author.
     */
    public readonly author: string;
    /**
     * The length of the track in milliseconds.
     */
    public readonly length: number;
    /**
     * If the track is a stream.
     */
    public readonly isStream: boolean;
    /**
     * The current position in the track, in milliseconds.
     */
    public readonly position: number;
    /**
     * The track's title.
     */
    public readonly title: string;
    /**
     * The track's URI.
     */
    public readonly uri: string;
    /**
     * The name of the track's source.
     */
    public readonly sourceName: string;

    /**
     * Create a new track.
     * @param data Track data from the server.
     * @param requester The track's requester. This value can be anything, and solely exists for your convenience.
     */
    constructor (data: TrackData, requester?: string) {
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
    public thumbnail (resolution: `default` | `mqdefault` | `hqdefault` | `maxresdefault`): string | undefined {
        if (this.sourceName === `youtube`) return `https://img.youtube.com/vi/${this.identifier}/${resolution}.jpg`;
        else return undefined;
    }
}
