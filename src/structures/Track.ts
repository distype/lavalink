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
     * Track information.
     */
    readonly info: TrackInfo
}

/**
 * Track information from the server.
 * This is used internally when creating the Track class, and is not easily accessible by the user.
 * @internal
 */
export interface TrackInfo {
    /**
     * The track's identifier.
     */
    readonly identifier: string
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
export class Track implements TrackInfo {
    /**
     * The track encoded into base64.
     */
    public readonly track: string;
    /**
     * The track's identifier.
     */
    public readonly identifier: string;
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
     * The track's requester.
     */
    public readonly requester: string;

    /**
     * Create a new track.
     * @param data Track data from the server.
     * @param requester The track's requester.
     */
    constructor (data: TrackData, requester: string) {
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
    public thumbnail (resolution: `default` | `mqdefault` | `hqdefault` | `maxresdefault`): string | undefined {
        if (this.sourceName === `youtube`) return `https://img.youtube.com/vi/${this.identifier}/${resolution}.jpg`;
        else return undefined;
    }
}

/**
 * Track partial - represents an unresolved {@link Track track}.
 */
export class TrackPartial {
    /**
     * The tracks's title.
     */
    public readonly title: string;
    /**
     * The track's requester.
     */
    public readonly requester: string;
    /**
     * The track's author.
     */
    public readonly author?: string;
    /**
     * The track's length in milliseconds.
     */
    public readonly length?: number;

    /**
   * Create a track partial.
   * @param title The track's title.
   * @param requester The track's requester.
   * @param author The track's author.
   * @param length The track's length in milliseconds.
   */
    constructor (title: string, requester: string, author?: string, length?: number) {
        this.title = title;
        this.requester = requester;
        this.author = author;
        this.length = length;
    }
}
