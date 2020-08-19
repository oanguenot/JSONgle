import { warn, debug } from "loglevel";

import { getLibName, getVersion } from "./utils/helper";
import Transport from "./transport/Transport";
import { propose } from "./protocol/jsongle";
import Peer from "./peer/Peer";
import { setVerboseLog } from "./utils/log";

/**
 * JSONgle class
 * Entry point of the library
 */
export default class JSONgle {
    constructor(cfg) {
        if (!cfg) {
            throw new TypeError("Argument 'cfg', is missing - 'Object' containing the global configuration");
        }

        this._name = getLibName();
        this._version = getVersion();
        this._transport = new Transport(cfg.transport);
        this._peer = new Peer(cfg.peer);
    }

    /**
     * Get the name of the library
     */
    get name() {
        return this._name;
    }

    /**
     * Get the version of the library
     */
    get version() {
        return this._version;
    }

    /**
     * Call a peer
     * @param {String} toId A String representing the peer id
     * @param {String} withMedia A String representing the media. Can be 'audio' or 'video'
     */
    call(toId, withMedia) {
        const media = withMedia || "audio";

        if (!toId) {
            throw new TypeError("Argument 'toId', is missing - 'String' representing the callee id");
        }

        if (!withMedia) {
            warn("No 'withMedia' argument specified - use 'audio' (default value)");
        }

        debug(`[call] initiate a new call to ${toId} using ${media}`);

        const msg = propose(toId, this._peer.id, media);

        this._transport.sendMessage(msg);
    }

    /**
     * Register to event 'oncallstatechanged'
     */
    set oncallstatechanged(callback) {
        this._transport.registerCallback("oncallstatechanged", callback);
    }

    /**
     * Set verbose log.
     * True to set log level to verbose, false otherwise
     */
    set verboseLog(isVerbose) {
        setVerboseLog(isVerbose);
    }
}
