import {
    getLibName,
    getVersion,
    generateNewId,
} from "./utils/helper";
import SessionHandler from "./protocol/SessionHandler";
import {
    setVerboseLog,
    debug,
    info,
} from "./utils/log";
import { createStore } from "./data/Store";
import { reducer as callReducer } from "./data/CallsReducer";
import {
    CALL_STATE,
    CALL_MEDIA,
    CALL_DIRECTION,
    CALL_ENDED_REASON,
    CALL_OFFERING_STATE,
    CALL_ACTIVE_STATE,
    CALL_ESTABLISHING_STATE,
    JSONGLE_ACTIONS,
    buildCustom,
    buildQuery,
} from "./protocol/jsongle";

const REQUEST_TIMEOUT = 5000;

const moduleName = "jsongle-indx";

/**
 * JSONgle class
 * Entry point of the library
 */
export default class JSONgle {
    constructor(cfg) {
        if (!cfg) {
            throw new Error("Argument 'cfg', is missing - 'Object' containing the global configuration");
        }

        if (cfg.verbose) {
            this.verboseLog = true;
        }
        this._name = getLibName();
        this._version = getVersion();

        info(moduleName, `welcome to ${this.name} version ${this.version}`);

        this._callStore = createStore(callReducer);
        this._callHandler = new SessionHandler(this._callStore, cfg.transport);
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
     * Return the current call or null
     */
    get currentCall() {
        return this._callHandler.currentCall;
    }

    /**
     * Get the peer id
     */
    get id() {
        return this._peerStore.getState().peer.id;
    }

    /**
     * Get a call ticket
     */
    get ticket() {
        if (!this.currentCall) {
            throw Error("Can't generate a ticket - no call");
        }

        return this.currentCall.ticketize();
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
            debug(moduleName, "no 'withMedia' argument specified - use 'audio' (default value)");
        }

        debug(moduleName, `call with '${media}`);

        this._callHandler.propose(this._peerStore.getState().peer.id, toId, media);
    }

    /**
     * End the current call
     */
    end() {
        if (!this.currentCall) {
            throw Error("Can't end the call - not in a call");
        }

        this._callHandler.retractOrTerminate(true, new Date());
    }

    /**
     * Proceed the current call
     */
    proceed() {
        if (!this.currentCall) {
            throw Error("Can't end the call - not in a call");
        }

        this._callHandler.proceed(true, new Date());
    }

    /**
     * Decline the current call
     */
    decline() {
        if (!this.currentCall) {
            throw Error("Can't end the call - not in a call");
        }

        this._callHandler.decline(true, new Date());
    }

    /**
     * Mute the audio leg of a call
     * Use to inform the other party that the audio media is not sent anymore
     */
    mute() {
        if (!this.currentCall) {
            throw Error("Can't mute the call - not in a call");
        }
        if (this.currentCall.muted) {
            throw Error("Can't mute the call - call is already muted");
        }

        this._callHandler.mute(true, new Date());
    }

    /**
     * Unmute the audio leg of a call
     * Use to inform the other party that the audio media is sent again
     */
    unmute() {
        if (!this.currentCall) {
            throw Error("Can't unmute the call - not in a call");
        }
        if (!this.currentCall.muted) {
            throw Error("Can't unmute the call - call is not muted");
        }

        this._callHandler.unmute(true, new Date());
    }

    /**
     * Send an offer to recipient
     * @param {*} offer The Offer to send
     */
    sendOffer(offer) {
        if (!this.currentCall) {
            throw Error("Can't send offer - not in a call");
        }

        if (!offer) {
            throw Error("Can't send offer - no offer");
        }

        info(moduleName, `send an offer of type '${offer.type}'`);

        if (offer.type === "offer") {
            this._callHandler.offer(true, offer, new Date());
        } else {
            this._callHandler.answer(true, offer, new Date());
        }
    }

    setAsActive() {
        if (!this.currentCall) {
            throw Error("Can't send offer - not in a call");
        }

        info(moduleName, "set call as 'active'");

        this._callHandler.active(true, new Date());
    }

    /**
     * Send the candidate to the recipient
     * @param {Object} candidate The candidate to send
     */
    sendCandidate(candidate) {
        if (!this.currentCall) {
            throw Error("Can't send candidate - not in a call");
        }

        if (!candidate) {
            throw Error("Can't send candidate - no candidate");
        }

        this._callHandler.offerCandidate(true, candidate, new Date());
    }

    /**
     * Send a custom message
     * @param {string} to The id of the recipient, a room or the server
     * @param {Object} content The message to send
     */
    send(to, content) {
        const jsongleMsg = buildCustom(JSONGLE_ACTIONS.CUSTOM, to, content);
        this._callHandler.send(true, jsongleMsg);
    }

    /**
     * Send a query set to a recipient, a room or the server
     * @param {string} to The id of the recipient, room or server
     * @param {string} query The query to execute (eg: session-register)
     * @param {object} content The JSON content
     * @param {*} transaction A transaction id (a default one is generated if not set)
     */
    async request(to, query, content, transaction = generateNewId()) {
        return new Promise((resolve, reject) => {
            let id;

            const timeout = new Promise((_, rej) => {
                id = setTimeout(() => {
                    rej(new Error("Request timed out"));
                }, REQUEST_TIMEOUT);
            });

            const fct = new Promise((res, rej) => {
                this._callHandler.registerCallback(transaction, (msg) => {
                    const { jsongle } = msg;
                    if (jsongle.action === JSONGLE_ACTIONS.IQ_ERROR) {
                        rej(jsongle);
                    } else {
                        res(jsongle);
                    }
                });

                const jsongleMsg = buildQuery(JSONGLE_ACTIONS.IQ_SET, query, to, content, transaction);
                this._callHandler.send(true, jsongleMsg);
            });

            Promise.race([fct, timeout]).then((jsongle) => {
                resolve(jsongle);
            }).catch((err) => {
                this._callHandler.unregisterCallback(transaction);
                reject(err);
            }).finally(() => {
                clearTimeout(id);
            });
        });
    }

    /**
     * Answer to a query (set or get) from a recipient, a room or the server
     * @param {string} to The id of the recipient, room or server
     * @param {string} query The query to execute (eg: session-register)
     * @param {object} content The JSON content
     * @param {*} transaction A transaction id (a default one is generated if not set)
     */
     answer(to, query, content, transaction) {
        return new Promise((resolve, reject) => {
            let id;

            const timeout = new Promise((_, rej) => {
                id = setTimeout(() => {
                    rej(new Error("Request timed out"));
                }, REQUEST_TIMEOUT);
            });

            const fct = new Promise((res) => {
                this._callHandler.registerCallback(transaction, (msg) => {
                    const { jsongle } = msg;
                    res(jsongle);
                });
                const jsongleMsg = buildQuery(JSONGLE_ACTIONS.IQ_RESULT, query, to, content, transaction);
                this._callHandler.send(true, jsongleMsg);
            });

            Promise.race([fct, timeout]).then((jsongle) => {
                resolve(jsongle);
            }).catch((err) => {
                this._callHandler.unregisterCallback(transaction);
                reject(err);
            }).finally(() => {
                clearTimeout(id);
            });
        });
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
     * Register to event 'onofferneeded'
     * Fired when the current call needs an offer to continue (from the PeerConnection)
     */
    set onofferneeded(callback) {
        this._callHandler.registerCallback("onofferneeded", callback);
    }

    /**
     * Register to event 'onofferreceived'
     * Fired when the current call needs an answer to continue (from the PeerConnection)
     */
    set onofferreceived(callback) {
        this._callHandler.registerCallback("onofferreceived", callback);
    }

    /**
     * Register to event 'oncandidatereceived'
     * Fired when the current call needs to give the received ICE Candidate (to the PeerConnection)
     */
    set oncandidatereceived(callback) {
        this._callHandler.registerCallback("oncandidatereceived", callback);
    }

    /**
     * Register to event 'onticket'
     * Fired when the call is ended
     */
    set onticket(callback) {
        this._callHandler.registerCallback("onticket", callback);
    }

    /**
     * Register to event 'oncallmuted'
     * Fired when the call is muted on the remote side
     */
     set oncallmuted(callback) {
        this._callHandler.registerCallback("oncallmuted", callback);
    }

    /**
     * Register to event 'oncallunmuted'
     * Fired when the call is unmuted on the remote side
     */
     set oncallunmuted(callback) {
        this._callHandler.registerCallback("oncallunmuted", callback);
    }

    /**
     * Register to event 'onlocalcallmuted'
     * Fired when the call is muted on the local side
     */
    set onlocalcallmuted(callback) {
        this._callHandler.registerCallback("onlocalcallmuted", callback);
    }

    /**
     * Register to event 'onlocalcallunmuted'
     * Fired when the call is unmuted on the local side
     */
    set onlocalcallunmuted(callback) {
        this._callHandler.registerCallback("onlocalcallunmuted", callback);
    }

    /**
     * Register to event 'ondatareceived'
     */
    set ondatareceived(callback) {
        this._callHandler.registerCallback("ondatareceived", callback);
    }

    /**
     * Register to event 'onerror'
     */
    set onerror(callback) {
        this._callHandler.registerCallback("onerror", callback);
    }

    /**
     * Register to event 'oniq'
     */
    set onrequest(callback) {
        this._callHandler.registerCallback("onrequest", callback);
    }

    /**
     * Register to event 'onevent'
     */
     set onevent(callback) {
        this._callHandler.registerCallback("onevent", callback);
    }

    /**
     * Set verbose log.
     * True to set log level to verbose, false otherwise
     */
    set verboseLog(isVerbose) {
        info(moduleName, `verbose log is activated '${isVerbose}'`);
        setVerboseLog(isVerbose);
    }

    /**
     * Definition of type CALL_STATE
     */
    static get CALL_STATE() {
        return CALL_STATE;
    }

    /**
     * Definition of type CALL_MEDIA
     */
    static get CALL_MEDIA() {
        return CALL_MEDIA;
    }

    /**
     * Definition of type CALL_DIRECTION
     */
    static get CALL_DIRECTION() {
        return CALL_DIRECTION;
    }

    /**
     * Definition of type CALL_ENDED_REASON
     */
    static get CALL_ENDED_REASON() {
        return CALL_ENDED_REASON;
    }

    /**
     * Definition of type CALL_OFFERING_STATE
     */
    static get CALL_OFFERING_STATE() {
        return CALL_OFFERING_STATE;
    }

    /**
     * Definition of type CALL_ACTIVE_STATE
     */
    static get CALL_ACTIVE_STATE() {
        return CALL_ACTIVE_STATE;
    }

    /**
     * Definition of type CALL_ESTABLISHING_STATE
     */
    static get CALL_ESTABLISHING_STATE() {
        return CALL_ESTABLISHING_STATE;
    }
}
