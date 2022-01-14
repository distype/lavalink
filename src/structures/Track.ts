import { TrackData } from '../typings/Lavalink';

export type TrackThumbnailResolution = `default` | `mqdefault` | `hqdefault` | `maxresdefault`

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

/**
 * A track.
 */
export class Track {
    /**
     * The track encoded into base64.
     */
    public readonly track: string;
    /**
     * The track's identifier.
     */
    // @ts-expect-error Property 'identifier' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly identifier: string;
    /**
     * If the track is seekable.
     */
    // @ts-expect-error Property 'isSeekable' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly isSeekable: boolean;
    /**
     * The track's author.
     */
    // @ts-expect-error Property 'author' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly author: string;
    /**
     * The length of the track in milliseconds.
     */
    // @ts-expect-error Property 'length' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly length: number;
    /**
     * If the track is a stream.
     */
    // @ts-expect-error Property 'isStream' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly isStream: boolean;
    /**
     * The current position in the track, in milliseconds.
     */
    // @ts-expect-error Property 'position' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly position: number;
    /**
     * The track's title.
     */
    // @ts-expect-error Property 'title' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly title: string;
    /**
     * The track's URI.
     */
    // @ts-expect-error Property 'uri' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly uri: string;
    /**
     * The name of the track's source.
     */
    // @ts-expect-error Property 'sourceName' has no initializer and is not definitely assigned in the constructor.ts(2564)
    public readonly sourceName: string;

    /**
     * Create a new track.
     * @param data Track data from the server.
     * @param requester The track's requester.
     */
    constructor (data: TrackData, public readonly requester: string) {
        if (!data) throw new TypeError(`Expected data to be defined`);

        this.track = data.track;
        // @ts-expect-error 7053
        for (const info in data.info) this[info] = data.info[info];
    }

    /**
     * Get the track's thumbnail. This is only supported by tracks with sourceName = 'youtube'.
     * @param resolution The thumbnail resolution.
     * @returns The track's thumbnail, if available.
     */
    public thumbnail (resolution: TrackThumbnailResolution): string | undefined {
        if (this.sourceName === `youtube`) return `https://img.youtube.com/vi/${this.identifier}/${resolution}.jpg`;
        else return undefined;
    }
}
