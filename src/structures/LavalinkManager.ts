import { Node as NodeClass, NodeOptions, NodeRequestOptions, NodeState } from './Node';
import { Track as TrackClass, TrackPartial as TrackPartialClass } from './Track';
import { Player as PlayerClass, PlayerOptions } from './Player';

import { BaseAdapter } from '../adapters/BaseAdapter';
import { TrackData } from '../typings/Lavalink';
import { Node, Player, Track, TrackPartial } from '../typings/lib';
import Constants from '../util/Constants';
import { TypedEmitter } from '../util/TypedEmitter';

import Collection from '@discordjs/collection';
import { GatewayVoiceServerUpdateDispatchData, GatewayVoiceStateUpdateDispatchData, Snowflake } from 'discord-api-types/v9';
import { request } from 'undici';

export interface CompleteLavalinkManagerOptions {
    /**
     * An array of nodes to connect to.
     */
    nodeOptions: NodeOptions[]
    /**
     * An array of enabled sources.
     * If spotify is specified, the spotifyAuth option should also be defined.
     * @default ['youtube', 'soundcloud']
     */
    enabledSources: Source[]
    /**
     * The default source to use for searches.
     * @default 'youtube'
     */
    defaultSource: Source
    /**
     * The type of CPU load to sort by when getting the least load node.
     * @default 'system'
     */
    leastLoadSort: `system` | `lavalink`
    /**
     * Authentication for the spotify API.
     * This will enable resolving spotify links into youtube tracks.
     */
    spotifyAuth?: {
        clientId: string
        clientSecret: string
    }
    /**
     * The default request options to use when sending requests to spotify.
     */
    defaultSpotifyRequestOptions?: NodeRequestOptions
}

export interface LavalinkManagerEvents {
    /**
     * Emitted when a node connects to it's lavalink server.
     */
    NODE_CONNECTED: Node
    /**
     * Emitted when a node is created.
     */
    NODE_CREATED: Node
    /**
     * Emitted when a node is destroyed.
     */
    NODE_DESTROYED: { node: Node, reason: string }
    /**
     * Emitted when a node disconnects from it's lavalink server.
     */
    NODE_DISCONNECTED: { node: Node, code: number, reason: string }
    /**
     * Emitted when a node encounters an error.
     */
    NODE_ERROR: { node: Node, error: Error }
    /**
     * Emitted when a node receives a payload from it's server.
     */
    NODE_RAW: { node: Node, payload: any }
    /**
     * Emitted when a node is attempting to reconnect.
     */
    NODE_RECONNECTING: Node
    /**
     * Emitted when a player connects to a VC.
     */
    PLAYER_CONNECTED: Player
    /**
     * Emitted when a player is created.
     */
    PLAYER_CREATED: Player
    /**
     * Emitted when a player is destroyed.
     */
    PLAYER_DESTROYED: { player: Player, reason: string }
    /**
     * Emitted when a player encounters an error.
     */
    PLAYER_ERROR: { player: Player, error: Error}
    /**
     * Emitted when a player manually moved. This includes the bot joining or leaving a VC.
     * The player is also automatically paused or destroyed when this event is emitted.
     */
    PLAYER_MOVED: { player: Player, oldChannel: Snowflake | null, newChannel: Snowflake | null }
    /**
     * Emitted when a player is paused.
     */
    PLAYER_PAUSED: { player: Player, reason: string }
    /**
     * Emitted when a player is resumed.
     */
    PLAYER_RESUMED: { player: Player, reason: string }
    /**
     * Emitted when the server sends a track end event.
     */
    PLAYER_TRACK_END: { player: Player, track: Track | null, reason: string }
    /**
     * Emitted when the server sends a track exception event.
     */
    PLAYER_TRACK_EXCEPTION: { player: Player, track: Track | null, message: string, severity: string, cause: string }
    /**
     * Emitted when the server sends a track start event.
     */
    PLAYER_TRACK_START: { player: Player, track: Track | null }
    /**
     * Emitted when the server sends a track stuck event.
     */
    PLAYER_TRACK_STUCK: { player: Player, track: Track | null, thresholdMs: number }
    /**
     * Emitted when the lavalink manager authorizes with spotify, or renews it's spotify token.
     */
    SPOTIFY_AUTHORIZED: { expiresIn: number, token: string }
    /**
     * Emitted when there is an error authorizing with spotify.
     */
    SPOTIFY_AUTH_ERROR: Error
}

export interface LavalinkManagerOptions extends Partial<CompleteLavalinkManagerOptions> {
    /**
     * An array of nodes to connect to.
     */
    nodeOptions: NodeOptions[]
}

/**
 * The result from a search.
 */
export interface SearchResult {
    /**
     * The result's load type.
     */
    loadType: `TRACK_LOADED` | `PLAYLIST_LOADED` | `SEARCH_RESULT` | `NO_MATCHES` | `LOAD_FAILED`
    /**
     * The found tracks.
     */
    tracks: Array<Track | TrackPartial>
    /**
     * Playlist info, if applicable.
     */
    playlistInfo?: {
        name: string
        selectedTrack: Track | null
    }
    /**
     * An exception, if applicable.
     */
    exception?: {
        message: string
        severity: string
    }
}

/**
 * A search source.
 */
export type Source = `youtube` | `soundcloud`

export class LavalinkManager extends TypedEmitter<LavalinkManagerEvents> {
    /**
     * The manager's nodes.
     */
    public nodes: Collection<number, Node> = new Collection();
    /**
     * The manager's options.
     */
    public readonly options: CompleteLavalinkManagerOptions;
    /**
     * The manager's players.
     */
    public players: Collection<Snowflake, Player> = new Collection();
    /**
     * The manager's spotify token.
     * Set when running LavalinkManager#connectNodes().
     */
    public spotifyToken: string | null = null;

    /**
     * Create a lavalink manager.
     * @param options The options to use for the manager.
     * @param adapter The manager's library adapter.
     */
    constructor (options: LavalinkManagerOptions, public adapter: BaseAdapter) {
        super();

        if (!options) throw new TypeError(`Expected options to be defined`);
        if (!adapter) throw new TypeError(`Expected worker to be defined`);

        if (!options.nodeOptions?.length) throw new Error(`At least 1 node must be defined`);
        if (options.enabledSources && options.defaultSource && !options.enabledSources.includes(options.defaultSource)) throw new Error(`Default source must be defined in enabled sources`);
        if (options.spotifyAuth && (!options.spotifyAuth.clientId || !options.spotifyAuth.clientSecret)) throw new Error(`Spotify auth is not properly defined`);

        for (const [i, nodeOption] of options.nodeOptions.entries()) this.nodes.set(i, new NodeClass(i, this, nodeOption));

        this.options = {
            nodeOptions: options.nodeOptions,
            enabledSources: options.enabledSources ?? [`youtube`, `soundcloud`],
            leastLoadSort: options.leastLoadSort ?? `system`,
            defaultSource: options.defaultSource ?? `youtube`,
            spotifyAuth: options.spotifyAuth
        };

        adapter.bind(this);
    }

    /**
     * Nodes sorted by cpu load.
     */
    public get leastLoadNodes (): Node[] {
        return this.nodes
            .reduce((p, v) => p.concat(v), [] as Node[])
            .filter((node) => node.state === NodeState.CONNECTED)
            .sort((a, b) => (a.stats.cpu ? a.stats.cpu[this.options.leastLoadSort === `system` ? `systemLoad` : `lavalinkLoad`] / a.stats.cpu.cores : 0) - (b.stats.cpu ? b.stats.cpu[this.options.leastLoadSort === `system` ? `systemLoad` : `lavalinkLoad`] / b.stats.cpu.cores : 0));
    }

    /**
     * Connect all nodes to their server.
     * @returns The results of node connection attempts.
     */
    public async connectNodes (): Promise<Array<PromiseSettledResult<Node>>> {
        if (this.options.spotifyAuth) void this._renewSpotifyLoop();
        const connect: Array<Promise<Node>> = [];
        this.nodes.forEach((node) => connect.push(new Promise((resolve, reject) => {
            let attempts = 0;
            const tryConnect: () => void = async () => {
                if (node.options.maxRetrys !== 0 && attempts >= node.options.maxRetrys) {
                    node.emit(`ERROR`, {
                        node, error: new Error(`Unable to connect after ${attempts} attempts`)
                    });
                    if (connectInterval) clearInterval(connectInterval);
                    reject(new Error(`Max connect retrys reached`));
                }
                await node.connect().catch(() => attempts++);
                if (node.state === NodeState.CONNECTED) {
                    if (connectInterval) clearInterval(connectInterval);
                    resolve(node);
                }
            };
            tryConnect();
            const connectInterval = setInterval(tryConnect, node.options.retryDelay);
        })));
        return await Promise.allSettled(connect);
    }

    /**
     * Create a new player.
     * @param options The player's options.
     * @returns The created player.
     */
    public createPlayer (options: PlayerOptions): Player {
        if (!options?.guildId) throw new TypeError(`Expected options.guildId to be defined`);
        if (this.players.get(options.guildId)) throw new Error(`A player already exists for that guild`);
        if (!this.leastLoadNodes[0]) throw new Error(`No available nodes to bind the player to`);
        const player = new PlayerClass(options, this.leastLoadNodes[0], this);
        this.players.set(options.guildId, player);
        return player;
    }

    /**
     * Get search results based on a query.
     * If the query is a link, it will attempt to get a track from the link. If not, it will return results from a search using the specified or default source.
     * If spotify auth is defined in the manager config, spotify links will resolve into youtube tracks.
     * @param query The query to search with.
     * @param requester The user that requsted the track. This value is not crucial.
     * @param source The source to use if the query is not a link, or if the link is from spotify. Defaults to the manager's default source.
     * @returns The search result.
     */
    public async search (query: string, requester: string, source: Source = this.options.defaultSource): Promise<SearchResult> {
        const searchNode = this.leastLoadNodes[0];
        if (!searchNode) throw new Error(`No available nodes to perform a search`);

        if (!this.options.enabledSources?.includes(source)) throw new Error(`The provided source is not enabled`);

        const spotifyMatch = query.match(Constants.SPOTIFY_REGEX) ?? [];
        if (this.spotifyToken && [`album`, `playlist`, `track`].includes(spotifyMatch[1])) {
            const headers: Record<string, any> = {
                'Authorization': this.spotifyToken,
                'Content-Type': `application/json`
            };

            if (spotifyMatch[1] === `album` || spotifyMatch[1] === `playlist`) {
                const res = await request(`${Constants.SPOTIFY_BASE_URL}/${spotifyMatch[1]}s/${spotifyMatch[2]}`, {
                    ...this.options.defaultSpotifyRequestOptions,
                    method: `GET`,
                    headers,
                    bodyTimeout: this.options.defaultSpotifyRequestOptions?.timeout
                });
                const data = await res.body.json();

                if (!data?.tracks?.items?.length) {
                    return {
                        loadType: `LOAD_FAILED`,
                        tracks: [],
                        exception: {
                            message: `No spotify tracks found: HTTP Code ${res.statusCode}`,
                            severity: `COMMON`
                        }
                    };
                }
                // @ts-expect-error Parameter 't' implicitly has an 'any' type.
                const tracks = data.tracks.items.map((t) => new TrackPartialClass((t.track ?? t).name, requester, (t.track ?? t).artists.map((a) => a.name).join(`, `), (t.track ?? t).duration_ms));
                let next = data.tracks.next;
                while (next) {
                    const nextRes = await request(next, {
                        ...this.options.defaultSpotifyRequestOptions,
                        method: `GET`,
                        headers,
                        bodyTimeout: this.options.defaultSpotifyRequestOptions?.timeout
                    });
                    const nextData = await nextRes.body.json();
                    // @ts-expect-error Parameter 't' implicitly has an 'any' type. Parameter 'a' implicitly has an 'any' type.
                    if (nextData?.items?.length) tracks.push(...nextData.items.map((t) => new TrackPartialClass((t.track ?? t).name, requester, (t.track ?? t).artists.map((a) => a.name).join(`, `), (t.track ?? t).duration_ms)));
                    if (nextData?.next) next = nextData.next;
                    else next = null;
                }
                return {
                    loadType: `PLAYLIST_LOADED`,
                    tracks: tracks,
                    playlistInfo: {
                        name: data.name,
                        selectedTrack: null
                    }
                };
            } else {
                const res = await request(`${Constants.SPOTIFY_BASE_URL}/${spotifyMatch[1]}s/${spotifyMatch[2]}`, {
                    ...this.options.defaultSpotifyRequestOptions,
                    method: `GET`,
                    headers,
                    bodyTimeout: this.options.defaultSpotifyRequestOptions?.timeout
                });
                const data = await res.body.json();
                return {
                    loadType: `TRACK_LOADED`,
                    // @ts-expect-error Parameter 'a' implicitly has an 'any' type.
                    tracks: [new TrackPartialClass(data.name, requester, data.artists.map((a) => a.name).join(`, `), data.duration_ms)]
                };
            }
        } else {
            const res = await searchNode.request(`GET`, `/loadtracks`, { query: { identifier: Constants.URL_REGEX.test(query) ? query : `${Constants.SOURCE_IDENTIFIERS[source] as string}search:${query}` } });

            if (!res?.json) throw new Error(`No search response data`);

            const searchResult: SearchResult = {
                loadType: res.json.loadType,
                tracks: res.json.tracks.map((data: TrackData) => new TrackClass(data, requester)),
                exception: res.json.exception
            };
            if (res.json.playlistInfo) {
                searchResult.playlistInfo = {
                    name: res.json.playlistInfo.Name,
                    selectedTrack: typeof res.json.playlistInfo.selectedTrack === `number` ? searchResult.tracks[res.json.playlistInfo.selectedTrack] as Track : null
                };
            }

            return searchResult;
        }
    }

    /**
     * Decode track strings into an array of tracks.
     * @param tracks The tracks encoded in base64.
     * @returns An array of the decoded tracks.
     */
    public async decodeTracks (tracks: string[]): Promise<Track[]> {
        const decodeNode = this.leastLoadNodes[0];
        if (!decodeNode) throw new Error(`No available nodes to decode the track`);

        const res = await decodeNode.request(`POST`, `/decodetracks`, { body: JSON.stringify(tracks) });
        if (!res?.json) throw new Error(`No decode response data`);
        return (res.json as []).map((data: TrackData) => new TrackClass(data, `N/A`));
    }

    /**
     * Resolve a track partial into a track.
     * @param track The track partial to resolve.
     * @returns The resolved track.
     */
    public async resolveTrack (track: TrackPartial): Promise<Track> {
        const search = await this.search(`${track.title}${track.author ? ` - ${track.author}` : ``}`, track.requester);
        search.tracks = search.tracks.filter((t) => t instanceof TrackClass);
        if (search.loadType !== `SEARCH_RESULT` || !search.tracks.length) throw new Error(`No results found`);
        if (track.author) {
            const sameAuthor = search.tracks.filter((t) => [track.author ?? ``, `${track.author ?? ``} - Topic`].some((name) => new RegExp(`^${name?.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)}$`, `i`).test(t.author ?? ``) ?? new RegExp(`^${name?.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)}$`, `i`).test(t.title ?? ``))) as Track[];
            if (sameAuthor.length) return sameAuthor[0];
        }
        if (track.length) {
            const sameDuration = search.tracks.filter((t) =>
                t.length &&
            (t.length >= ((track.length ?? 0) - 2000)) &&
            (t.length <= ((track.length ?? 0) + 200))
            ) as Track[];
            if (sameDuration.length) return sameDuration[0];
        }
        return search.tracks[0] as Track;
    }

    /**
     * Handle voice state update data.
     * @param event The emitted event.
     * @param data Data from the event.
     * @internal
     */
    public _handleVoiceUpdate <T extends `VOICE_SERVER_UPDATE` | `VOICE_STATE_UPDATE`>(event: T, data: T extends `VOICE_SERVER_UPDATE` ? GatewayVoiceServerUpdateDispatchData : GatewayVoiceStateUpdateDispatchData): void {
        if (!data.guild_id) return;
        const player = this.players.get(data.guild_id);
        if (!player) return;

        if (event === `VOICE_STATE_UPDATE`) {
            if ((data as GatewayVoiceStateUpdateDispatchData).user_id !== this.adapter.getBotId()) return;
            void player._handleMove((data as GatewayVoiceStateUpdateDispatchData).channel_id, data as GatewayVoiceStateUpdateDispatchData);
        } else if (event === `VOICE_SERVER_UPDATE`) {
            player.node.send({
                op: `voiceUpdate`,
                guildId: player.options.guildId,
                sessionId: await this.adapter.getGuildShardSessionId(player.options.guildId),
                event: data
            }).catch(() => {});
        }
    }

    /**
     * Authorize with Spotify.
     * @returns The time the token is valid for in milliseconds.
     */
    private async _authorizeSpotify (): Promise<number> {
        if (!this.options.spotifyAuth) throw new Error(`Spotify auth must be defined`);

        const res = await request(Constants.SPOTIFY_TOKEN_ENDPOINT, {
            ...this.options.defaultSpotifyRequestOptions,
            method: `POST`,
            headers: {
                'Authorization': `Basic ${Buffer.from(`${this.options.spotifyAuth.clientId}:${this.options.spotifyAuth.clientSecret}`).toString(`base64`)}`,
                'Content-Type': `application/x-www-form-urlencoded`
            },
            body: `grant_type=client_credentials`,
            bodyTimeout: this.options.defaultSpotifyRequestOptions?.timeout
        });

        const data = await res.body.json();
        if (!data?.access_token) throw new Error(`Invalid Spotify authentication`);
        this.spotifyToken = `Bearer ${data.access_token as string}`;
        this.emit(`SPOTIFY_AUTHORIZED`, {
            expiresIn: data.expires_in * 1000, token: this.spotifyToken
        });
        return data.expires_in * 1000;
    }

    /**
     * A helper function to loop renewing spotify tokens.
     */
    private async _renewSpotifyLoop (): Promise<void> {
        setTimeout(() => void this._renewSpotifyLoop(), await new Promise((resolve) => {
            const auth: () => void = () => void this._authorizeSpotify().then((time) => resolve(time)).catch((error) => {
                this.emit(`SPOTIFY_AUTH_ERROR`, error);
                auth();
            });
            auth();
        }));
    }
}
