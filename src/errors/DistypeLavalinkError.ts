import { Snowflake } from 'distype';

/**
 * The system the error was emitted from.
 */
export type DistypeLavalinkErrorSystem = `Lavalink Manager` | `Lavalink Node ${number}` | `Lavalink Player ${Snowflake}`;

/**
 * The type of error that has ocurred.
 */
export enum DistypeLavalinkErrorType {
    /**
     * `client#gateway#user` is undefined.
     */
    DISTYPE_GATEWAY_USER_UNDEFINED = `DISTYPE_GATEWAY_USER_UNDEFINED`,
    /**
     * When there are no available {@link Node nodes} to perform an action.
     * Should be emitted by the {@link Manager Lavalink manager}.
     */
    MANAGER_NO_NODES_AVAILABLE = `MANAGER_NO_NODES_AVAILABLE`,
    /**
     * When no response is provided to a request from the {@link Manager Lavalink manager}.
     * Should be emitted by the {@link Manager Lavalink manager}.
     */
    MANAGER_NO_RESPONSE_DATA = `MANAGER_REST_NO_RESPONSE_DATA`,
    /**
     * The {@link Node node} is already connecting.
     * Should be emitted by a {@link Node node}.
     */
    NODE_ALREADY_CONNECTING = `NODE_ALREADY_CONNECTING`,
    /**
     * The {@link Node node}'s connection attempts were interrupted by a call to kill the {@link Node node}.
     * Should be emitted by a {@link Node node}.
     */
    NODE_INTERRUPT_FROM_KILL = `NODE_INTERRUPT_FROM_KILL`,
    /**
     * The {@link Node node} was closed while initiating the socket.
     * Should be emitted by a {@link Node node}.
     */
    NODE_CLOSED_DURING_SOCKET_INIT = `NODE_CLOSED_DURING_SOCKET_INIT`,
    /**
     * The {@link Node node} reached the maximum number of spawn attempts specified.
     * Should be emitted by a {@link Node node}.
     */
    NODE_MAX_SPAWN_ATTEMPTS_REACHED = `NODE_MAX_SPAWN_ATTEMPTS_REACHED`,
    /**
     * The {@link Node node} was received a 4xx or 5xx status code from a REST request.
     * Should be emitted by the {@link Node node}.
     */
    NODE_REST_REQUEST_ERROR = `NODE_REST_REQUEST_ERROR`,
    /**
     * The {@link Node node} was unable to parse a REST response body.
     * Should be emitted by the {@link Node node}.
     */
    NODE_REST_UNABLE_TO_PARSE_RESPONSE_BODY = `NODE_REST_UNABLE_TO_PARSE_RESPONSE_BODY`,
    /**
     * The {@link Node node} tried sending data to the gateway while the socket wasn't open.
     * Should be emitted by a {@link Node node}.
     */
    NODE_SEND_WITHOUT_OPEN_SOCKET = `NODE_SEND_WITHOUT_OPEN_SOCKET`,
    /**
     * The {@link Player player} is already connecting.
     * Should be emitted by a {@link Player player}.
     */
    PLAYER_ALREADY_CONNECTING = `PLAYER_ALREADY_CONNECTING`,
    /**
     * An invalid seek position was specified.
     * Should be emitted by a {@link Player player}.
     */
    PLAYER_INVALID_SEEK_POSITION = `PLAYER_INVALID_SEEK_POSITION`,
    /**
     * An invalid skip position was specified.
     * Should be emitted by a {@link Player player}.
     */
    PLAYER_INVALID_SKIP_POSITION = `PLAYER_INVALID_SKIP_POSITION`,
    /**
     * The {@link Player player} is missing permissions to perform an action.
     * Should be emitted by a {@link Player player}.
     */
    PLAYER_MISSING_PERMISSIONS = `PLAYER_MISSING_PERMISSIONS`,
    /**
     * There was a conflict with the {@link Player player}'s {@link PlayerState state} while performing an action.
     * Should be emitted by a {@link Player player}.
     */
    PLAYER_STATE_CONFLICT = `PLAYER_STATE_CONFLICT`,
    /**
     * The {@link Player player} was destroyed or the connection timed out while connecting to the voice channel.
     * Should be emitted by a {@link Player player}.
     */
    PLAYER_VOICE_CONNECTION_FAILED = `PLAYER_VOICE_CONNECTION_FAILED`,
    /**
     * A specified volume is out of range.
     * Should be emitted by a {@link Player player}.
     */
    PLAYER_VOLUME_OUT_OF_RANGE = `PLAYER_VOLUME_OUT_OF_RANGE`
}

/**
 * An error emitted from `@distype/lavalink`.
 */
export class DistypeLavalinkError extends Error {
    /**
     * The type of error that has ocurred.
     */
    public readonly errorType: DistypeLavalinkErrorType;
    /**
     * The system the error was emitted from.
     */
    public readonly system: DistypeLavalinkErrorSystem;

    /**
     * Create a `@distype/lavalink` error.
     * @param message The error's message.
     * @param errorType The type of error that has ocurred.
     * @param system The system the error was emitted from.
     */
    constructor (message: string, errorType: DistypeLavalinkErrorType, system: DistypeLavalinkErrorSystem) {
        super(message);

        this.errorType = errorType;
        this.system = system;
    }

    /**
     * The name of the error.
     */
    public override get name (): `DistypeLavalinkError` {
        return `DistypeLavalinkError`;
    }
}
