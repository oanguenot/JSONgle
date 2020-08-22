import { debug, warn } from "loglevel";
import Transport from "../transport/Transport";
import { CALL_ACTIONS } from "../data/CallsReducer";
import Call from "./Call";
import { JSONGLE_ACTIONS, SESSION_INFO_REASON } from "./jsongle";

export default class CallHandler {
    constructor(callStore, transportCfg) {
        this._currentCall = null;
        this._callStore = callStore;
        this._transport = new Transport(transportCfg, this.onMessageFromTransport, this);

        this._callbacks = {
            oncall: null,
            oncallstatechanged: null,
            oncallended: null,
        };
    }

    onMessageFromTransport(message) {
        if (!message.jsongle) {
            warn("[call-handler] can't handle message - not a JSONgle message");
            return;
        }

        const { action, reason } = message.jongle;

        debug(`[call-handler] handle message ${action}`);

        switch (action) {
            case JSONGLE_ACTIONS.INFO:
                this.handleSessionInfoMessage(reason);
                break;
            default:
                break;
        }
    }

    handleSessionInfoMessage(reason) {
        switch (reason) {
            case SESSION_INFO_REASON.UNREACHABLE:
            case SESSION_INFO_REASON.UNKNOWN_SESSION:
                this.abort(reason);
                break;
            case SESSION_INFO_REASON.TRYING:
                this.trying();
                break;
            default:
                break;
        }
    }

    initiate(fromId, toId, media) {
        debug(`[call-handler] initiate a new call to ${toId} using ${media}`);
        this._currentCall = new Call(fromId, toId, media);
        debug(`[call-handler] current call ${this._currentCall.id}`);

        if (this._callbacks.oncall) {
            this._callbacks.oncall(this._currentCall);
        }

        this._callStore.dispatch({ type: CALL_ACTIONS.INITIATE, payload: {} });

        const propose = this._currentCall.propose();

        if (this._callbacks.oncallstatechanged) {
            this._callbacks.oncallstatechanged(this._currentCall);
        }

        this._transport.sendMessage(propose);
    }

    try() {
        debug(`[call-handler] try current call ${this._currentCall.id}`);
        this._currentCall.trying();
        if (this._callbacks.oncallstatechanged) {
            this._callbacks.oncallstatechanged(this._currentCall);
        }
    }

    abort(reason) {
        debug(`[call-handler] abord current call ${this._currentCall.id}`);
        this._currentCall.abort(reason);
        if (this._callbacks.oncallended) {
            this._callbacks.oncallended(this._currentCall);
        }

        if (this._callbacks.oncallstatechanged) {
            this._callbacks.oncallstatechanged(this._currentCall);
        }

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE, payload: {} });
        this._currentCall = null;
    }

    registerCallback(name, callback) {
        if (name in this._callbacks) {
            this._callbacks[name] = callback;
            debug(`[call-handler] registered callback ${name}`);
        }
    }
}
