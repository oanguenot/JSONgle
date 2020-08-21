import { warn, debug } from "loglevel";

import { getLibName, getVersion } from "./utils/helper";
import Transport from "./transport/Transport";
import Peer from "./peer/Peer";
import { setVerboseLog } from "./utils/log";
import Call from "./protocol/Call";
import { createStore } from "./data/Store";
import { reducer, ACTIONS } from "./data/Reducer";

/**
 * JSONgle class
 * Entry point of the library
 */
export default class JSONgle {
    constructor(cfg) {
        if (!cfg) {
            throw new Error("Argument 'cfg', is missing - 'Object' containing the global configuration");
        }

        this._name = getLibName();
        this._version = getVersion();
        this._store = createStore(reducer);
        this._transport = new Transport(cfg.transport, this._store);
        this._store.dispatch({ type: ACTIONS.SET_PEER, payload: new Peer(cfg.peer) });
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
        if (this._currentCall) {
            throw Error("Can't initiate a new call - Already have a call");
        }

        const media = withMedia || "audio";

        if (!toId) {
            throw new Error("Argument 'toId', is missing - 'String' representing the callee id");
        }

        if (!withMedia) {
            warn("No 'withMedia' argument specified - use 'audio' (default value)");
        }

        debug(`[call] initiate a new call to ${toId} using ${media}`);

        const call = new Call(this._store.getState().peer.id, toId, media);
        const propose = call.propose(call);

        this._store.dispatch({ type: ACTIONS.NEW_CALL, payload: { call } });

        this._transport.sendMessage(propose);
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

    /**
     * Return the current call
     */
    get currentCall() {
        return this._store.getState().currentCall;
    }
}
