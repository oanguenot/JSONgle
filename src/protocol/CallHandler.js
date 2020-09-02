import { debug, warn } from "../utils/log";
import Transport from "../transport/Transport";
import { CALL_ACTIONS } from "../data/CallsReducer";
import Call from "./Call";
import { JSONGLE_ACTIONS, SESSION_INFO_REASON, CALL_DIRECTION } from "./jsongle";

const moduleName = "call-handler";

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
            warn(moduleName, "can't handle message - not a JSONgle message");
            return;
        }

        const { action, reason } = message.jsongle;

        debug(moduleName, `handle action '${action}'`);

        switch (action) {
            case JSONGLE_ACTIONS.INFO:
                this.handleSessionInfoMessage(reason);
                break;
            case JSONGLE_ACTIONS.PROPOSE:
                this.handleProposeMessage(message);
                break;
            default:
                break;
        }
    }

    handleProposeMessage(message) {
        debug(moduleName, `call proposed from '${message.from}' using media '${message.jsongle.description.media}'`);
        this._currentCall = new Call(
            message.from,
            message.to,
            message.jsongle.description.media,
            CALL_DIRECTION.INCOMING,
            message.jsongle.sid,
            new Date(message.jsongle.description.initiated)
        );
        this.ringing(true);
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
            case SESSION_INFO_REASON.RINGING:
                this.ringing(false);
                break;
            default:
                break;
        }
    }

    propose(fromId, toId, media) {
        debug(moduleName, `propose call to '${toId}' using media '${media}'`);
        this._currentCall = new Call(fromId, toId, media, CALL_DIRECTION.OUTGOING);
        debug(moduleName, `call sid '${this._currentCall.id}'`);

        this.fireOnCall();

        this._callStore.dispatch({ type: CALL_ACTIONS.INITIATE_CALL, payload: {} });

        const proposeMsg = this._currentCall.propose().jsongleze();

        this._transport.sendMessage(proposeMsg);
    }

    retractOrTerminate() {
        if (!this._currentCall.isInProgress && !this._currentCall.isActive) {
            warn(moduleName, `call with sid '${this._currentCall.id}' is not in progress or active`);
            this.abort("incorrect-state");
            return;
        }

        if (this._currentCall.isInProgress) {
            debug(moduleName, `retract call sid '${this._currentCall.id}'`);
            this._currentCall.retract();
        } else {
            debug(moduleName, `terminate call sid '${this._currentCall.id}'`);
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
        debug(moduleName, `try call sid '${this._currentCall.id}'`);
        this._currentCall.trying();
        this.fireOnCallStateChanged();
    }

    abort(reason) {
        debug(moduleName, `abort call sid '${this._currentCall.id}'`);
        this._currentCall.abort(reason);

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    ringing(isNewCall) {
        debug(moduleName, `ring call sid '${this._currentCall.id}'`);
        const ringingMsg = this._currentCall.ringing().jsongleze();

        if (!isNewCall) {
            this.fireOnCallStateChanged();
        } else {
            this.fireOnCall();
            this._callStore.dispatch({ type: CALL_ACTIONS.ANSWER_CALL, payload: {} });
            this._transport.sendMessage(ringingMsg);
        }
    }

    registerCallback(name, callback) {
        if (name in this._callbacks) {
            this._callbacks[name] = callback;
            debug(moduleName, `registered callback '${name}'`);
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
