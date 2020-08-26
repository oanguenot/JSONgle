import { warn } from "loglevel";
import { getLibName, getVersion } from "./utils/helper";

import Peer from "./peer/Peer";
import CallHandler from "./protocol/CallHandler";
import { setVerboseLog } from "./utils/log";
import { createStore } from "./data/Store";
import { reducer as callReducer } from "./data/CallsReducer";
import { reducer as peerReducer, PEER_ACTIONS } from "./data/PeerReducer";

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
        this._callStore = createStore(callReducer);
        this._peerStore = createStore(peerReducer);
        this._peerStore.dispatch({ type: PEER_ACTIONS.SET_PEER, payload: { peer: new Peer(cfg.peer) } });
        this._callHandler = new CallHandler(this._callStore, cfg.transport);
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
        if (this.currentCall) {
            throw Error("Can't initiate a new call - Already have a call");
        }

        const media = withMedia || "audio";

        if (!toId) {
            throw new Error("Argument 'toId', is missing - 'String' representing the callee id");
        }

        if (!withMedia) {
            warn("No 'withMedia' argument specified - use 'audio' (default value)");
        }

        console.log(">>>this._peer", this._peerStore.getState());

        this._callHandler.propose(this._peerStore.getState().peer.id, toId, media);
    }

    /**
     * End the current call
     */
    end() {
        if (!this.currentCall) {
            throw Error("Can't end the call - not in a call");
        }

        this._callHandler.retractOrTerminate();
    }

    /**
     * Register to event 'oncallstatechanged'
     * Fired when the state of the call has changed
     */
    set oncallstatechanged(callback) {
        this._callHandler.registerCallback("oncallstatechanged", callback);
    }

    /**
     * Register to event 'oncall'
     * Fired when a call has been initiated or received
     */
    set oncall(callback) {
        this._callHandler.registerCallback("oncall", callback);
    }

    /**
     * Register to event 'oncallended'
     * Fired when the current call has been ended (aborded, declined, retracted, disconnected)
     */
    set oncallended(callback) {
        this._callHandler.registerCallback("oncallended", callback);
    }

    /**
     * Set verbose log.
     * True to set log level to verbose, false otherwise
     */
    set verboseLog(isVerbose) {
        setVerboseLog(isVerbose);
    }

    /**
     * Return the current call or null
     */
    get currentCall() {
        return this._callHandler.currentCall;
    }
}
