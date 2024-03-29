import {
    getLibName,
    getVersion,
    generateNewId,
} from "./utils/helper";
import SessionHandler from "./protocol/SessionHandler";
import {
    debug,
    info,
    setLogLevel,
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
    buildSimpleMessage,
    buildQuery,
    buildEvent,
    buildCallMessage,
    MESSAGE_EVENTS,
    EVENTS_NAMESPACE,
    ACK_TYPES,
    TYPING_STATES,
    MUTED_MEDIA,
    LOG_LEVEL,
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

        if (cfg.logLevel) {
            setLogLevel(cfg.logLevel);
        }
        this._name = getLibName();
        this._version = getVersion();

        info(moduleName, `welcome to ${this.name} version ${this.version}`);

        this._callStore = createStore(callReducer);
        this._sessionHandler = new SessionHandler(this._callStore, cfg.transport);
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
        return this._sessionHandler.currentCall;
    }

    /**
     * Get the peer id
     */
    get id() {
        return this._sessionHandler.from;
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

        this._sessionHandler.propose(toId, media);
    }

    /**
     * End the current call
     */
    end() {
        if (!this.currentCall) {
            throw Error("Can't end the call - not in a call");
        }

        this._sessionHandler.retractOrTerminate(true, new Date());
    }

    /**
     * Proceed the current call
     */
    proceed() {
        if (!this.currentCall) {
            throw Error("Can't end the call - not in a call");
        }

        this._sessionHandler.proceed(true, new Date());
    }

    /**
     * Decline the current call
     */
    decline() {
        if (!this.currentCall) {
            throw Error("Can't end the call - not in a call");
        }

        this._sessionHandler.decline(true, new Date());
    }

    /**
     * Mute audio and video
     * Use to inform the other party that the audio media is not sent anymore
     */
     mute() {
        if (!this.currentCall) {
            throw Error("Can't mute the call - not in a call");
        }
        if (this.currentCall.muted) {
            throw Error("Can't mute the call - call is already muted for audio or video or all");
        }
        this._sessionHandler.mute(true, new Date(), MUTED_MEDIA.ALL);
    }

    /**
     * Mute the audio leg of a call
     * Use to inform the other party that the audio media is not sent anymore
     */
    muteAudio() {
        if (!this.currentCall) {
            throw Error("Can't mute the call - not in a call");
        }
        if (this.currentCall.muted && (this.currentCall.mutedMedia === MUTED_MEDIA.AUDIO || this.currentCall.mutedMedia === MUTED_MEDIA.ALL)) {
            throw Error("Can't mute the call - call is already muted for audio");
        }
        this._sessionHandler.mute(true, new Date(), MUTED_MEDIA.AUDIO);
    }

    /**
     * Mute the video leg of a call
     * Use to inform the other party that the audio media is not sent anymore
     */
     muteVideo() {
        if (!this.currentCall) {
            throw Error("Can't mute the call - not in a call");
        }
        if (this.currentCall.muted && (this.currentCall.mutedMedia === MUTED_MEDIA.VIDEO || this.currentCall.mutedMedia === MUTED_MEDIA.ALL)) {
            throw Error("Can't mute the call - call is already muted for video");
        }
        this._sessionHandler.mute(true, new Date(), MUTED_MEDIA.VIDEO);
    }

    /**
     * UnMute audio and video
     * Use to inform the other party that the audio media is not sent anymore
     */
     unmute() {
        if (!this.currentCall) {
            throw Error("Can't unmute the call - not in a call");
        }
        if (!this.currentCall.muted || (this.currentCall.muted && this.currentCall.mutedMedia !== MUTED_MEDIA.ALL)) {
            throw Error("Can't unmute the call - call is not muted or not muted all");
        }
        this._sessionHandler.unmute(true, new Date(), MUTED_MEDIA.ALL);
    }

    /**
     * Unmute the audio leg of a call
     * Use to inform the other party that the audio media is sent again
     */
    unmuteAudio() {
        if (!this.currentCall) {
            throw Error("Can't unmute the call - not in a call");
        }
        if (!this.currentCall.muted || (this.currentCall.mutedMedia === MUTED_MEDIA.VIDEO || this.currentCall.mutedMedia === MUTED_MEDIA.NONE)) {
            throw Error("Can't unmute the call - call is not muted for audio");
        }
        this._sessionHandler.unmute(true, new Date(), MUTED_MEDIA.AUDIO);
    }

    /**
     * Unmute the video leg of a call
     * Use to inform the other party that the audio media is sent again
     */
     unmuteVideo() {
        if (!this.currentCall) {
            throw Error("Can't unmute the call - not in a call");
        }
        if (!this.currentCall.muted || (this.currentCall.mutedMedia === MUTED_MEDIA.AUDIO || this.currentCall.mutedMedia === MUTED_MEDIA.NONE)) {
            throw Error("Can't unmute the call - call is not muted for video");
        }
        this._sessionHandler.unmute(true, new Date(), MUTED_MEDIA.VIDEO);
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
            this._sessionHandler.offer(true, offer, new Date());
        } else {
            this._sessionHandler.answer(true, offer, new Date());
        }
    }

    setAsActive() {
        if (!this.currentCall) {
            throw Error("Can't send offer - not in a call");
        }

        info(moduleName, "set call as 'active'");

        this._sessionHandler.active(true, new Date());
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

        this._sessionHandler.offerCandidate(true, candidate, new Date());
    }

    /**
     * Report metrics to the server
     * @param {string} sid The session or call Id
     * @param {object} metrics An object containing the metrics to send
     * @param {string} to The id of the recpient (can be the server, a recipient or a room)
     */
     reportMetrics(sid, metrics, to) {
        if (!metrics && !sid && !to) {
            throw Error("Can't send metrics - bad parameters used");
        }

        const report = {};

        if ("mos" in metrics && typeof metrics.mos === "number") {
            report.mos = metrics.mos;
        }

        if ("duration" in metrics && typeof metrics.duration === "number") {
            report.duration = metrics.duration;
        }

        if ("ua" in metrics && typeof metrics.ua === "string") {
            report.ua = metrics.ua;
        }

        if ("route" in metrics && typeof metrics.route === "string") {
            report.route = metrics.route;
        }

        if ("error" in metrics && typeof metrics.error === "string") {
            report.error = metrics.error;
        }

        if (Object.keys(report) === 0) {
            throw Error("Can't send metrics - no parameters provided");
        }

        report.issuedAt = new Date().toJSON();

        const metricsMsg = buildCallMessage(JSONGLE_ACTIONS.METRICS, to, EVENTS_NAMESPACE.CALL, sid, report);
        this._sessionHandler.send(true, metricsMsg);
    }

    /**
     * Send a custom message
     * @param {string} to The id of the recipient
     * @param {Object} content The message to send
     * @return {string} The id of the message (used for message acknowledgment)
     */
    sendJSON(to, content) {
        if (!to || !content) {
            throw Error("Can't send a JSON message - bad parameters used");
        }
        const jsongleMsg = buildSimpleMessage(JSONGLE_ACTIONS.CUSTOM, to, EVENTS_NAMESPACE.MESSAGE, { sent: new Date().toJSON(), content });
        this._sessionHandler.send(true, jsongleMsg);
        return jsongleMsg.id;
    }

    /**
     * Send a custom message to a MUC room
     * @param {string} to The id of room
     * @param {Object} content The message to send
     * @return {string} The id of the message (used for message acknowledgment)
     */
     sendJSONMUC(to, content) {
        if (!to || !content) {
            throw Error("Can't send a JSON message - bad parameters used");
        }
        const jsongleMsg = buildSimpleMessage(JSONGLE_ACTIONS.CUSTOM, to, EVENTS_NAMESPACE.MUC, { sent: new Date().toJSON(), content });
        this._sessionHandler.send(true, jsongleMsg);
        return jsongleMsg.id;
    }

    /**
     * Send a text message
     * @param {string} to The id of the recipient or a room or the server
     * @param {string} content The text message to send
     * @param {object} additionalContent (Optional) The additional content to send - can be any type of content: object, string
     * @return {string} The id of the message (used for message acknowledgment)
     */
     send(to, content, additionalContent) {
        if (!to || (!content && !additionalContent)) {
            throw Error("Can't send a text message - bad parameters used");
        }
        const jsongleMsg = buildSimpleMessage(JSONGLE_ACTIONS.TEXT, to, EVENTS_NAMESPACE.MESSAGE, { sent: new Date().toJSON(), content: content || "", additionalContent: additionalContent || null });
        this._sessionHandler.send(true, jsongleMsg);
        return jsongleMsg.id;
    }

    /**
     * Send a text message to a muc room
     * @param {string} to The id of the muc room
     * @param {string} content The text message to send
     * @param {object} data (Optional) The additional content to send - can be any type of content: object, string
     * @return {string} The id of the message (used for message acknowledgment)
     */
     sendMuc(to, content, additionalContent) {
        if (!to || (!content && !additionalContent)) {
            throw Error("Can't send a text message - bad parameters used");
        }

        const jsongleMsg = buildSimpleMessage(JSONGLE_ACTIONS.TEXT, to, EVENTS_NAMESPACE.MUC, { sent: new Date().toJSON(), content: content || "", additionalContent: additionalContent || null });
        this._sessionHandler.send(true, jsongleMsg);
        return jsongleMsg.id;
    }

    /**
     * Send a query set to a recipient, a room or the server
     * @param {string} to The id of the recipient, room or server
     * @param {string} query The query to execute (eg: session-register)
     * @param {object} content The JSON content
     * @param {string} transaction A transaction id (a default one is generated if not set)
     */
    async request(to, query, content, transaction = generateNewId()) {
        return new Promise((resolve, reject) => {
            if (!to || !query || !content) {
                reject(new Error("Can't send a request - bad parameters used"));
            }

            let id;

            const timeout = new Promise((_, rej) => {
                id = setTimeout(() => {
                    rej(new Error("Request timed out"));
                }, REQUEST_TIMEOUT);
            });

            const fct = new Promise((res, rej) => {
                this._sessionHandler.registerCallback(transaction, (msg) => {
                    const { jsongle } = msg;
                    if (jsongle.action === JSONGLE_ACTIONS.IQ_ERROR) {
                        rej(jsongle);
                    } else {
                        res(jsongle);
                    }
                });

                const jsongleMsg = buildQuery(JSONGLE_ACTIONS.IQ_SET, query, to, content, transaction);
                this._sessionHandler.send(true, jsongleMsg);
            });

            Promise.race([fct, timeout]).then((jsongle) => {
                resolve(jsongle);
            }).catch((err) => {
                this._sessionHandler.unregisterCallback(transaction);
                reject(err);
            }).finally(() => {
                clearTimeout(id);
            });
        });
    }

    /**
     * Answer to a query (set or get) from a recipient, a room or the server.
     * @param {string} to The id of the recipient, room or server
     * @param {string} query The query to execute (eg: muc-join)
     * @param {object} content The JSON content
     * @param {string} transaction A transaction id (a default one is generated if not set)
     * @return A Promise
     */
     answer(to, query, content, transaction) {
        return new Promise((resolve, reject) => {
            let id;

            if (!to || !query || !content || !transaction) {
                reject(new Error("Can't answer the query - bad parameters used"));
            }

            const timeout = new Promise((_, rej) => {
                id = setTimeout(() => {
                    rej(new Error("Request timed out"));
                }, REQUEST_TIMEOUT);
            });

            const fct = new Promise((res) => {
                this._sessionHandler.registerCallback(transaction, (msg) => {
                    const { jsongle } = msg;
                    res(jsongle);
                });
                const jsongleMsg = buildQuery(JSONGLE_ACTIONS.IQ_RESULT, query, to, content, transaction);
                this._sessionHandler.send(true, jsongleMsg);
            });

            Promise.race([fct, timeout]).then((jsongle) => {
                resolve(jsongle);
            }).catch((err) => {
                this._sessionHandler.unregisterCallback(transaction);
                reject(err);
            }).finally(() => {
                clearTimeout(id);
            });
        });
    }

    /**
     * Read acknowledgement of a message received
     * @param {string} id The id of the message to ack
     * @param {string} to The issuer of that message
     */
    sendAReadAcknowledgement(id, to) {
        if (!id || !to) {
            throw Error("Can't mark a message a read - bad parameters used");
        }
        const jsongleAckEvent = buildEvent(JSONGLE_ACTIONS.EVENT, to, MESSAGE_EVENTS.ACK, EVENTS_NAMESPACE.MESSAGE, { acknowledged: new Date().toJSON(), mid: id, type: ACK_TYPES.READ });
        this._sessionHandler.send(true, jsongleAckEvent);
    }

    /**
     * Read acknowledgement of a message received in a MUC
     * @param {string} id The id of the message to ack
     * @param {string} to The issuer of that message
     */
     sendAReadAcknowledgementMuc(id, to) {
        if (!id || !to) {
            throw Error("Can't mark a message a read - bad parameters used");
        }
        const jsongleAckEvent = buildEvent(JSONGLE_ACTIONS.EVENT, to, MESSAGE_EVENTS.ACK, EVENTS_NAMESPACE.MUC, { acknowledged: new Date().toJSON(), mid: id, type: ACK_TYPES.READ });
        this._sessionHandler.send(true, jsongleAckEvent);
    }

    /**
     * Send a reaction to a message
     * @param {string} id The id of the message to react
     * @param {string} reaction The reaction. Can be empty to remove a reaction
     * @param {string} to The issuer of the message
     */
    reactToMessage(id, reaction, to) {
        if (!id || !to) {
            throw Error("Can't send a reaction to a message - bad parameters used");
        }

        const jsongleReactionEvent = buildEvent(JSONGLE_ACTIONS.EVENT, to, MESSAGE_EVENTS.REACTION, EVENTS_NAMESPACE.MESSAGE, { reacted: new Date().toJSON(), mid: id, type: reaction || "" });
        this._sessionHandler.send(true, jsongleReactionEvent);
    }

    /**
     * Send a reaction to a message
     * @param {string} id The id of the message to react
     * @param {string} reaction The reaction. Can be empty to remove a reaction
     * @param {string} to The issuer of the message
     */
    reactToMessageMUC(id, reaction, to) {
        if (!id || !to) {
            throw Error("Can't send a reaction to a message - bad parameters used");
        }

        const jsongleReactionEvent = buildEvent(JSONGLE_ACTIONS.EVENT, to, MESSAGE_EVENTS.REACTION, EVENTS_NAMESPACE.MUC, { reacted: new Date().toJSON(), mid: id, type: reaction || "" });
        this._sessionHandler.send(true, jsongleReactionEvent);
    }

    /**
     * Send the typing state
     * @param {boolean} state True when typing a message. False elsewhere
     * @param {string} to The id of the recipient
     */
     isTyping(state, to) {
        if (!to) {
            throw Error("Can't send the typing state - bad parameters used");
        }
        const isTypingEvent = buildEvent(JSONGLE_ACTIONS.EVENT, to, MESSAGE_EVENTS.TYPING, EVENTS_NAMESPACE.MESSAGE, { state: state ? TYPING_STATES.COMPOSING : TYPING_STATES.ACTIVE, updated: new Date().toJSON() });
        this._sessionHandler.send(true, isTypingEvent);
    }

    /**
     * Send the typing state in a muc room
     * @param {boolean} state True when typing a message. False elsewhere
     * @param {string} to The id of the recipient
     */
     isTypingMuc(state, to) {
        if (!to) {
            throw Error("Can't send the typing state - bad parameters used");
        }
        const isTypingEvent = buildEvent(JSONGLE_ACTIONS.EVENT, to, MESSAGE_EVENTS.TYPING, EVENTS_NAMESPACE.MUC, { state: state ? TYPING_STATES.COMPOSING : TYPING_STATES.ACTIVE, updated: new Date().toJSON() });
        this._sessionHandler.send(true, isTypingEvent);
    }

    /**
     * Register a callback to the event 'oncallstatechanged'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set oncallstatechanged(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("oncallstatechanged");
        }
        this._sessionHandler.registerCallback("oncallstatechanged", callback);
    }

    /**
     * Register a callback to the event 'oncall'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set oncall(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("oncall");
        }
        this._sessionHandler.registerCallback("oncall", callback);
    }

    /**
     * Register a callback to the event 'oncallended'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set oncallended(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("oncallended");
        }
        this._sessionHandler.registerCallback("oncallended", callback);
    }

    /**
     * Register a callback to the event 'onofferneeded'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set onofferneeded(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onofferneeded");
        }
        this._sessionHandler.registerCallback("onofferneeded", callback);
    }

    /**
     * Register a callback to the event 'onofferreceived'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set onofferreceived(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onofferreceived");
        }
        this._sessionHandler.registerCallback("onofferreceived", callback);
    }

    /**
     * Register a callback to the event 'oncandidatereceived'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set oncandidatereceived(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("oncandidatereceived");
        }
        this._sessionHandler.registerCallback("oncandidatereceived", callback);
    }

    /**
     * Register a callback to the event 'onticket'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set onticket(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onticket");
        }
        this._sessionHandler.registerCallback("onticket", callback);
    }

    /**
     * Register a callback to the event 'oncallmuted'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
     set oncallmuted(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("oncallmuted");
        }
        this._sessionHandler.registerCallback("oncallmuted", callback);
    }

   /**
     * Register a callback to the event 'oncallunmuted'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
     set oncallunmuted(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("oncallunmuted");
        }
        this._sessionHandler.registerCallback("oncallunmuted", callback);
    }

    /**
     * Register a callback to the event 'onlocalcallmuted'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set onlocalcallmuted(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onlocalcallmuted");
        }
        this._sessionHandler.registerCallback("onlocalcallmuted", callback);
    }

    /**
     * Register a callback to the event 'onlocalcallunmuted'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set onlocalcallunmuted(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onlocalcallunmuted");
        }
        this._sessionHandler.registerCallback("onlocalcallunmuted", callback);
    }

    /**
     * Register a callback to the event 'ondatareceived'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set ondatareceived(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("ondatareceived");
        }
        this._sessionHandler.registerCallback("ondatareceived", callback);
    }

   /**
     * Register a callback to the event 'onmessagereceived'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
     set onmessagereceived(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onmessagereceived");
        }
        this._sessionHandler.registerCallback("onmessagereceived", callback);
    }

    /**
     * Register a callback to the event 'onerror'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set onerror(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onerror");
        }
        this._sessionHandler.registerCallback("onerror", callback);
    }

    /**
     * Register a callback to the event 'onrequest'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
    set onrequest(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onrequest");
        }
        this._sessionHandler.registerCallback("onrequest", callback);
    }

    /**
     * Register a callback to the event 'onevent'
     * @param {fct} callback Register this function to the event. Unregister is callback is null
     */
     set onevent(callback) {
        if (!callback) {
            this._sessionHandler.unregisterCallback("onevent");
        }
        this._sessionHandler.registerCallback("onevent", callback);
    }

    /**
     * Set the log level.
     * True to set log level to verbose, false otherwise
     */
    set logLevel(level) {
        info(moduleName, `change log level to '${level}'`);
        setLogLevel(level);
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

    /**
     * Definition of type LOG_LEVEL
     */
     static get LOG_LEVEL() {
        return LOG_LEVEL;
    }
}
