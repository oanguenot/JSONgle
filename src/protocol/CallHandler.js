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

    propose(fromId, toId, media) {
        debug(`[call-handler] 'propose' a new call to ${toId} using ${media}`);
        this._currentCall = new Call(fromId, toId, media);
        debug(`[call-handler] current call ${this._currentCall.id}`);

        this.fireOnCall();

        this._callStore.dispatch({ type: CALL_ACTIONS.INITIATE_CALL, payload: {} });

        const proposeMsg = this._currentCall.propose().jsongleze();

        this.fireOnCallStateChanged();

        this._transport.sendMessage(proposeMsg);
    }

    retractOrTerminate() {
        if (!this._currentCall.isInProgress && !this._currentCall.isActive) {
            debug(`[call-handler] current call ${this._currentCall.id} is not in progress or active`);
            this.abort("incorrect-state");
            return;
        }

        if (this._currentCall.isInProgress) {
            debug(`[call-handler] 'retract' current call ${this._currentCall.id}`);
            this._currentCall.retract();
        } else {
            debug(`[call-handler] 'terminate' current call ${this._currentCall.id}`);
            this._currentCall.terminate();
        }

        const msg = this._currentCall.jsongleze();

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();

        this._transport.sendMessage(msg);

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    trying() {
        debug(`[call-handler] 'try' current call ${this._currentCall.id}`);
        this._currentCall.trying();
        this.fireOnCallStateChanged();
    }

    abort(reason) {
        debug(`[call-handler] 'abort' current call ${this._currentCall.id}`);
        this._currentCall.abort(reason);

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    registerCallback(name, callback) {
        if (name in this._callbacks) {
            this._callbacks[name] = callback;
            debug(`[call-handler] registered callback ${name}`);
        }
    }

    fireOnCallStateChanged() {
        if (this._callbacks.oncallstatechanged) {
            this._callbacks.oncallstatechanged(this._currentCall);
        }
    }

    fireOnCall() {
        if (this._callbacks.oncall) {
            this._callbacks.oncall(this._currentCall);
        }
    }

    fireOnCallEnded() {
        if (this._callbacks.oncallended) {
            this._callbacks.oncallended(this._currentCall);
        }
    }
}
