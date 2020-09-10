import { debug, warn } from "../utils/log";
import Transport from "../transport/Transport";
import { CALL_ACTIONS } from "../data/CallsReducer";
import Call from "./Call";
import { JSONGLE_ACTIONS, SESSION_INFO_REASON, CALL_DIRECTION } from "./jsongle";
import { error } from "loglevel";

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
            onofferneeded: null,
            onofferreceived: null,
            oncandidatereceived: null,
        };
    }

    onMessageFromTransport(message) {
        if (!message.jsongle) {
            warn(moduleName, "can't handle message - not a JSONgle message");
            return;
        }

        const { action } = message.jsongle;

        debug(moduleName, `handle action '${action}'`);

        switch (action) {
            case JSONGLE_ACTIONS.INFO:
                this.handleSessionInfoMessage(message.jsongle);
                break;
            case JSONGLE_ACTIONS.PROPOSE:
                this._currentCall = new Call(
                    message.from,
                    message.to,
                    message.jsongle.description.media,
                    CALL_DIRECTION.INCOMING,
                    message.jsongle.sid,
                    new Date(message.jsongle.description.initiated)
                );
                this.ringing(true, new Date());
                break;
            case JSONGLE_ACTIONS.RETRACT:
                this.retractOrTerminate(false, new Date(message.jsongle.description.ended));
                break;
            case JSONGLE_ACTIONS.DECLINE:
                this.decline(false, new Date(message.jsongle.description.ended));
                break;
            case JSONGLE_ACTIONS.PROCEED:
                this.proceed(false, new Date(message.jsongle.description.proceeded));
                break;
            case JSONGLE_ACTIONS.INITIATE:
                this.offer(false, message.jsongle.description.offer, new Date(message.jsongle.description.offering));
                break;
            case JSONGLE_ACTIONS.ACCEPT:
                this.answer(false, message.jsongle.description.answer, new Date(message.jsongle.description.offered));
                break;
            case JSONGLE_ACTIONS.TRANSPORT:
                this.offerCandidate(
                    false,
                    message.jsongle.description.candidate,
                    new Date(message.jsongle.description.establishing)
                );
                break;
            default:
                break;
        }
    }

    handleSessionInfoMessage(jsongle) {
        switch (jsongle.reason) {
            case SESSION_INFO_REASON.UNREACHABLE:
            case SESSION_INFO_REASON.UNKNOWN_SESSION:
                this.abort(jsongle.reason, new Date(jsongle.description.aborted));
                break;
            case SESSION_INFO_REASON.TRYING:
                this.trying(new Date(jsongle.description.tried));
                break;
            case SESSION_INFO_REASON.RINGING:
                this.ringing(false, new Date(jsongle.description.rang));
                break;
            default:
                this.noop();
                break;
        }
    }

    propose(fromId, toId, media) {
        this._currentCall = new Call(fromId, toId, media, CALL_DIRECTION.OUTGOING);

        debug(moduleName, `propose call ${this._currentCall.id} to '${toId}' with '${media}'`);

        this.fireOnCall();

        this._callStore.dispatch({ type: CALL_ACTIONS.INITIATE_CALL, payload: {} });

        const proposeMsg = this._currentCall.propose().jsongleze();

        this._transport.sendMessage(proposeMsg);
    }

    proceed(shouldSendMessage = true, proceededAt) {
        if (shouldSendMessage) {
            debug(moduleName, `proceed call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `call ${this._currentCall.id} proceeded`);
        }

        this._currentCall.proceed(proceededAt);
        this.fireOnCallStateChanged();

        if (shouldSendMessage) {
            const msg = this._currentCall.jsongleze();
            this._transport.sendMessage(msg);
        } else {
            this.fireOnOfferNeeded();
        }
    }

    decline(shouldSendMessage = true, declinedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `decline call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `call ${this._currentCall.id} declined`);
        }

        this._currentCall.decline(declinedAt);
        this.fireOnCallStateChanged();
        this.fireOnCallEnded();

        if (shouldSendMessage) {
            const msg = this._currentCall.jsongleze();
            this._transport.sendMessage(msg);
        }

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    retractOrTerminate(shouldSendMessage = true, ended) {
        if (!this._currentCall.isInProgress && !this._currentCall.isActive) {
            warn(moduleName, `call with sid '${this._currentCall.id}' is not in progress or active`);
            this.abort("incorrect-state");
            return;
        }

        if (this._currentCall.isInProgress) {
            if (shouldSendMessage) {
                debug(moduleName, `retract call '${this._currentCall.id}'`);
            } else {
                debug(moduleName, `call ${this._currentCall.id} retracted`);
            }
            this._currentCall.retract(ended);
        } else {
            if (shouldSendMessage) {
                debug(moduleName, `terminate call '${this._currentCall.id}'`);
            } else {
                debug(moduleName, `call ${this._currentCall.id} terminated`);
            }
            this._currentCall.terminate(ended);
        }

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();

        if (shouldSendMessage) {
            const msg = this._currentCall.jsongleze();
            this._transport.sendMessage(msg);
        }

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    trying(triedAt) {
        debug(moduleName, `try call '${this._currentCall.id}'`);
        this._currentCall.trying(triedAt);
        this.fireOnCallStateChanged();
    }

    abort(reason, abortedAt) {
        debug(moduleName, `abort call '${this._currentCall.id}'`);
        this._currentCall.abort(reason, abortedAt);

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    ringing(isNewCall = false, ringingAt) {
        debug(moduleName, `ring call '${this._currentCall.id}'`);
        const ringingMsg = this._currentCall.ringing(ringingAt).jsongleze();

        if (isNewCall) {
            this.fireOnCall();
            this._callStore.dispatch({ type: CALL_ACTIONS.ANSWER_CALL, payload: {} });
            this._transport.sendMessage(ringingMsg);
        }

        this.fireOnCallStateChanged();
    }

    offer(shouldSendMessage = true, offer, offeredAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send offer for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received offer for call '${this._currentCall.id}'`);
        }

        if (shouldSendMessage) {
            this._currentCall.setLocalOffer(offer);
        } else {
            this._currentCall.setRemoteOffer(offer);
        }

        this._currentCall.offer(offeredAt);

        if (shouldSendMessage) {
            const offerMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(offerMsg);
        } else {
            this.fireOnOfferReceived(offer);
            this.fireOnOfferNeeded();
        }

        this.fireOnCallStateChanged();
    }

    answer(shouldSendMessage = true, offer, answeredAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send answer for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received answer for call '${this._currentCall.id}'`);
        }

        if (shouldSendMessage) {
            this._currentCall.setLocalOffer(offer);
        } else {
            this._currentCall.setRemoteOffer(offer);
        }

        this._currentCall.answer(answeredAt);

        if (shouldSendMessage) {
            const answerMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(answerMsg);
        } else {
            this.fireOnOfferReceived(offer);
        }

        this.fireOnCallStateChanged();
    }

    offerCandidate(shouldSendMessage, candidate, establishedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send candidate for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received candidate for call '${this._currentCall.id}'`);
        }

        this._currentCall.establish(candidate, establishedAt, shouldSendMessage);

        if (shouldSendMessage) {
            const offerMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(offerMsg);
        } else {
            this.fireOnCandidateReceived(candidate);
        }

        this.fireOnCallStateChanged();
    }

    noop() {
        debug(moduleName, "do nothing - strange!");
    }

    registerCallback(name, callback) {
        if (name in this._callbacks) {
            this._callbacks[name] = callback;
            debug(moduleName, `registered callback '${name}'`);
        } else {
            error(moduleName, `can't register callback for '${name}'`);
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

    fireOnOfferNeeded() {
        if (this._callbacks.onofferneeded) {
            this._callbacks.onofferneeded(this._currentCall);
        }
    }

    fireOnOfferReceived(offer) {
        if (this._callbacks.onofferreceived) {
            this._callbacks.onofferreceived(offer);
        }
    }

    fireOnCandidateReceived(candidate) {
        if (this._callbacks.oncandidatereceived) {
            this._callbacks.oncandidatereceived(candidate);
        }
    }

    get currentCall() {
        return this._currentCall;
    }
}
