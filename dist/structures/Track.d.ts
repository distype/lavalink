/**
 * Track data received from the server.
 * This is used internally when creating the Track class, and is not easily accessible by the user.
 * @internal
 */
export interface TrackData {
    /**
     * The base64 encoded track.
     */
    readonly track: string;
    /**
     * The track's identifier.
     */
    readonly identifier: string;
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
}
/**
 * A track.
 */
export declare class Track implements TrackData {
    /**
     * The track's requester.
     * This value can be anything, and solely exists for your convenience.
     */
    requester?: string;
    /**
     * The track encoded into base64.
     */
    readonly track: string;
    /**
     * The track's identifier.
     */
    readonly identifier: string;
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
     * @param requester The track's requester. This value can be anything, and solely exists for your convenience.
     */
    constructor(data: TrackData, requester?: string);
    /**
     * Get the track's thumbnail. This is only supported by tracks with sourceName = 'youtube'.
     * @param resolution The thumbnail resolution.
     * @returns The track's thumbnail, if available.
     */
    thumbnail(resolution: `default` | `mqdefault` | `hqdefault` | `maxresdefault`): string | undefined;
}
