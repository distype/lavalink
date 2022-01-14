import { TrackData } from '../typings/Lavalink';
export declare type TrackThumbnailResolution = `default` | `mqdefault` | `hqdefault` | `maxresdefault`;
/**
 * Track partial - represents an unresolved {@link Track track}.
 */
export declare class TrackPartial {
    /**
     * The tracks's title.
     */
    readonly title: string;
    /**
     * The track's requester.
     */
    readonly requester: string;
    /**
     * The track's author.
     */
    readonly author?: string;
    /**
     * The track's length in milliseconds.
     */
    readonly length?: number;
    /**
   * Create a track partial.
   * @param title The track's title.
   * @param requester The track's requester.
   * @param author The track's author.
   * @param length The track's length in milliseconds.
   */
    constructor(title: string, requester: string, author?: string, length?: number);
}
/**
 * A track.
 */
export declare class Track {
    readonly requester: string;
    /**
     * The track encoded into base64.
     */
    readonly track: string;
    /**
     * The track's identifier.
     */
    readonly identifier: string;
    /**
     * If the track is seekable.
     */
    readonly isSeekable: boolean;
    /**
     * The track's author.
     */
    readonly author: string;
    /**
     * The length of the track in milliseconds.
     */
    readonly length: number;
    /**
     * If the track is a stream.
     */
    readonly isStream: boolean;
    /**
     * The current position in the track, in milliseconds.
     */
    readonly position: number;
    /**
     * The track's title.
     */
    readonly title: string;
    /**
     * The track's URI.
     */
    readonly uri: string;
    /**
     * The name of the track's source.
     */
    readonly sourceName: string;
    /**
     * Create a new track.
     * @param data Track data from the server.
     * @param requester The track's requester.
     */
    constructor(data: TrackData, requester: string);
    /**
     * Get the track's thumbnail. This is only supported by tracks with sourceName = 'youtube'.
     * @param resolution The thumbnail resolution.
     * @returns The track's thumbnail, if available.
     */
    thumbnail(resolution: TrackThumbnailResolution): string | undefined;
}
