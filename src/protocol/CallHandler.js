import { debug, warn, error } from "../utils/log";
import { CALL_DIRECTION, CALL_STATE, STATE_ACTIONS, STATES, getCallStateActionFromSignalingAction } from "./jsongle";
import Transport from "../transport/Transport";
import { CALL_ACTIONS } from "../data/CallsReducer";
import Call from "./Call";

const moduleName = "call-handler";

const isStateActionValidInState = (action, state) => {
    const currentState = state || CALL_STATE.NEW;

    // Return false if current state is not handled
    if (!(currentState in STATES)) {
        error(moduleName, `state ${state} is not handled`);
        return false;
    }

    // Return false if action is not handled in that state
    if (!STATES[currentState].includes(action)) {
        error(moduleName, `action ${action} not authorized in state ${state}`);
        return false;
    }

    // Elsewhere return true
    return true;
};

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
            onticket: null,
        };
    }

    onMessageFromTransport(message) {
        const route = (action, msg) => {
            const routing = {};
            routing[STATE_ACTIONS.PROPOSE] = () => {
                this._currentCall = new Call(
                    msg.from,
                    msg.to,
                    msg.jsongle.description.media,
                    CALL_DIRECTION.INCOMING,
                    msg.jsongle.sid,
                    new Date(msg.jsongle.description.initiated)
                );
                this.ringing(true, new Date());
            };
            routing[STATE_ACTIONS.TRY] = () => {
                this.trying(new Date(msg.jsongle.description.tried));
            };
            routing[STATE_ACTIONS.RING] = () => {
                this.ringing(false, new Date(msg.jsongle.description.rang));
            };

            routing[STATE_ACTIONS.UNREACH] = () => {
                this.abort(message.jsongle.reason, new Date(msg.jsongle.description.ended));
            };

            routing[STATE_ACTIONS.RETRACT] = () => {
                this.retractOrTerminate(false, new Date(msg.jsongle.description.ended));
            };

            routing[STATE_ACTIONS.DECLINE] = () => {
                this.decline(false, new Date(message.jsongle.description.ended));
            };

            routing[STATE_ACTIONS.PROCEED] = () => {
                this.proceed(false, new Date(message.jsongle.description.proceeded));
            };

            routing[STATE_ACTIONS.INITIATE] = () => {
                this.offer(false, msg.jsongle.description.offer, new Date(msg.jsongle.description.offering));
            };

            routing[STATE_ACTIONS.ACCEPT] = () => {
                this.answer(false, msg.jsongle.description.answer, new Date(msg.jsongle.description.offered));
            };

            routing[STATE_ACTIONS.TRANSPORT] = () => {
                this.offerCandidate(
                    false,
                    msg.jsongle.description.candidate,
                    new Date(msg.jsongle.description.establishing)
                );
            };

            routing[STATE_ACTIONS.ACTIVATE] = () => {
                this.active(false, new Date(msg.jsongle.description.actived));
            };

            routing[STATE_ACTIONS.CANCEL] = () => {
                this.retractOrTerminate(false, new Date(message.jsongle.description.ended));
            };

            routing[STATE_ACTIONS.END] = () => {
                this.retractOrTerminate(false, new Date(message.jsongle.description.ended));
            };

            if (!(action in routing)) {
                warn(moduleName, `transition '${action}' is not yet implemented`);
                return;
            }

            debug(moduleName, `transit to action ${action}`);
            routing[action]();
        };

        if (!message.jsongle) {
            warn(moduleName, "can't handle message - not a JSONgle message");
            return;
        }

        const { action, reason } = message.jsongle;

        debug(moduleName, `handle action '${action}'`);
        const stateAction = getCallStateActionFromSignalingAction(action, reason);
        debug(moduleName, `deduced state action is '${stateAction}'`);
        const currentState = this._currentCall ? this._currentCall.state : CALL_STATE.NEW;
        debug(moduleName, `current state is '${currentState}'`);

        const isStateActionValid = isStateActionValidInState(stateAction, currentState);

        if (!isStateActionValid) {
            warn(moduleName, `'${stateAction}' is not valid - don't execute transition`);
            return;
        }

        debug(moduleName, `'${stateAction}' is valid - execute transition`);
        route(stateAction, message);
    }

    propose(fromId, toId, media) {
        this._currentCall = new Call(fromId, toId, media, CALL_DIRECTION.OUTGOING);

        debug(moduleName, `propose call ${this._currentCall.id} to '${toId}' with '${media}'`);

        this.fireOnCall();
        this.fireOnCallStateChanged();

        this._callStore.dispatch({ type: CALL_ACTIONS.INITIATE_CALL, payload: {} });

        const proposeMsg = this._currentCall.transitToPropose().jsongleze();

        this._transport.sendMessage(proposeMsg);

        return this;
    }

    proceed(shouldSendMessage = true, proceededAt) {
        if (shouldSendMessage) {
            debug(moduleName, `proceed call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `call ${this._currentCall.id} proceeded`);
        }

        this._currentCall.transitToProceeded(proceededAt);
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

        this._currentCall.transitToEndedWithReasonDeclined(declinedAt);
        this.fireOnCallStateChanged();
        this.fireOnCallEnded();
        this.fireOnTicket();

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
            this._currentCall.transitToEndedWithReasonRetracted(ended);
        } else {
            if (shouldSendMessage) {
                debug(moduleName, `terminate call '${this._currentCall.id}'`);
            } else {
                debug(moduleName, `call ${this._currentCall.id} terminated`);
            }
            this._currentCall.transitToEndedWithReasonTerminated(ended);
        }

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();
        this.fireOnTicket();

        if (shouldSendMessage) {
            const msg = this._currentCall.jsongleze();
            this._transport.sendMessage(msg);
        }

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    trying(triedAt) {
        debug(moduleName, `try call '${this._currentCall.id}'`);
        this._currentCall.transitToTrying(triedAt);
        this.fireOnCallStateChanged();
    }

    abort(reason, abortedAt) {
        debug(moduleName, `abort call '${this._currentCall.id}'`);
        this._currentCall.transitToEndedWithReasonAborted(reason, abortedAt);

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();
        this.fireOnTicket();

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    ringing(isNewCall = false, ringingAt) {
        debug(moduleName, `ring call '${this._currentCall.id}'`);
        const ringingMsg = this._currentCall.transitToRinging(ringingAt).jsongleze();

        this.fireOnCallStateChanged();

        if (isNewCall) {
            this.fireOnCall();
            this._callStore.dispatch({ type: CALL_ACTIONS.ANSWER_CALL, payload: {} });
            this._transport.sendMessage(ringingMsg);
        }
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

        this._currentCall.transitToOfferingWithReasonHaveOffer(offeredAt);
        this.fireOnCallStateChanged();

        if (shouldSendMessage) {
            const offerMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(offerMsg);
        } else {
            this.fireOnOfferReceived(offer);
            this.fireOnOfferNeeded();
        }
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
        this.fireOnCallStateChanged();

        if (shouldSendMessage) {
            const answerMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(answerMsg);
        } else {
            this.fireOnOfferReceived(offer);
        }
    }

    offerCandidate(shouldSendMessage, candidate, establishedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send candidate for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received candidate for call '${this._currentCall.id}'`);
        }

        this._currentCall.establish(candidate, establishedAt, shouldSendMessage);
        this.fireOnCallStateChanged();

        if (shouldSendMessage) {
            const offerMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(offerMsg);
        } else {
            this.fireOnCandidateReceived(candidate);
        }
    }

    active(shouldSendMessage, activedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send active for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received active for call '${this._currentCall.id}'`);
        }

        this._currentCall.transitToActive(activedAt, shouldSendMessage);
        this.fireOnCallStateChanged();

        if (shouldSendMessage) {
            const activeMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(activeMsg);
        }
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

    fireOnTicket() {
        if (this._callbacks.onticket) {
            const ticket = this._currentCall.ticketize();
            this._callbacks.onticket(ticket);
        }
    }

    get currentCall() {
        return this._currentCall;
    }
}
