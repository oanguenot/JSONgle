import { debug, warn, error } from "../utils/log";
import {
    CALL_DIRECTION,
    CALL_STATE,
    STATE_ACTIONS,
    STATES,
    getCallStateActionFromSignalingAction,
    SESSION_INFO_REASON,
    JSONGLE_ACTIONS,
    IQ_QUERY,
    ACK_TYPES,
    MESSAGE_EVENTS,
    buildEvent,
    EVENTS_NAMESPACE,
} from "./jsongle";
import Transport from "../transport/Transport";
import { CALL_ACTIONS } from "../data/CallsReducer";
import Call from "./Call";

const moduleName = "session-handler";

const isStateActionValidInState = (action, state) => {
    const currentState = state || CALL_STATE.FREE;

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

export default class SessionHandler {
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
            oncallmuted: null,
            oncallunmuted: null,
            onlocalcallmuted: null,
            onlocalcallunmuted: null,
            onticket: null,
            ondatareceived: null,
            onmessagereceived: null,
            onerror: null,
            onrequest: null,
            onevent: null,
        };
    }

    onMessageFromTransport(message) {
        const route = (action, msg) => {
            const routing = {};
            routing[STATE_ACTIONS.PROPOSE] = () => {
                this._currentCall = new Call(msg.from, msg.to, msg.jsongle.description.media, CALL_DIRECTION.INCOMING, msg.jsongle.sid, new Date(msg.jsongle.description.initiated));
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
                this.offerCandidate(false, msg.jsongle.description.candidate, new Date(msg.jsongle.description.establishing));
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

            routing[STATE_ACTIONS.MUTE] = () => {
                this.mute(false, new Date(message.jsongle.description.muted));
            };

            routing[STATE_ACTIONS.UNMUTE] = () => {
                this.unmute(false, new Date(message.jsongle.description.unmuted));
            };

            routing[STATE_ACTIONS.SEND] = () => {
                this.send(false, msg);
            };

            routing[STATE_ACTIONS.ERROR] = () => {
                this.error(msg);
            };

            routing[STATE_ACTIONS.IQ] = () => {
                this.iq(msg);
            };

            routing[STATE_ACTIONS.ACK] = () => {
                this.ack(msg);
            };

            routing[STATE_ACTIONS.EVENT] = () => {
                this.event(msg);
            };

            if (!(action in routing)) {
                warn(moduleName, `transition '${action}' is not yet implemented`);
                return;
            }
            routing[action]();
        };

        if (!message.jsongle) {
            warn(moduleName, "can't handle message - not a JSONgle message");
            return;
        }

        const { action, reason } = message.jsongle;

        debug(moduleName, `handle action '${action}'`);
        const stateAction = getCallStateActionFromSignalingAction(action, reason);
        const currentState = this._currentCall ? this._currentCall.state : CALL_STATE.FREE;
        debug(moduleName, `try to execute '${stateAction}' in state '${currentState}'`);
        const isStateActionValid = isStateActionValidInState(stateAction, currentState);

        if (!isStateActionValid) {
            warn(moduleName, `'${stateAction}' is not valid - don't execute transition`);
            return;
        }
        route(stateAction, message);
    }

    propose(toId, media) {
        this._currentCall = new Call(this._transport.from, toId, media, CALL_DIRECTION.OUTGOING);

        debug(moduleName, `propose call ${this._currentCall.id} to '${toId}' with '${media}'`);

        this._callStore.dispatch({ type: CALL_ACTIONS.INITIATE_CALL, payload: {} });
        const proposeMsg = this._currentCall.transitToPropose().jsongleze();
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);
        this._transport.sendMessage(proposeMsg);

        this.fireOnCall();
        this.fireOnCallStateChanged();

        return this;
    }

    proceed(shouldSendMessage = true, proceededAt) {
        if (shouldSendMessage) {
            debug(moduleName, `proceed call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `call ${this._currentCall.id} proceeded`);
        }

        this._currentCall.transitToProceeded(proceededAt);
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);

        if (shouldSendMessage) {
            const msg = this._currentCall.jsongleze();
            this._transport.sendMessage(msg);
        } else {
            this.fireOnOfferNeeded();
        }
        this.fireOnCallStateChanged();
    }

    decline(shouldSendMessage = true, declinedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `decline call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `call ${this._currentCall.id} declined`);
        }

        this._currentCall.transitToEndedWithReasonDeclined(declinedAt);
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);

        if (shouldSendMessage) {
            const msg = this._currentCall.jsongleze();
            this._transport.sendMessage(msg);
        }

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();
        this.fireOnTicket();

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    retractOrTerminate(shouldSendMessage = true, ended) {
        if (!this._currentCall.inProgress && !this._currentCall.active) {
            warn(moduleName, `call with sid '${this._currentCall.id}' is not in progress or active`);
            this.abort("incorrect-state");
            return;
        }

        if (this._currentCall.inProgress) {
            if (shouldSendMessage) {
                debug(moduleName, `retract call '${this._currentCall.id}'`);
            } else {
                debug(moduleName, `call ${this._currentCall.id} retracted`);
            }
            this._currentCall.transitToEndedWithReasonRetracted(ended);
            debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);
        } else {
            if (shouldSendMessage) {
                debug(moduleName, `terminate call '${this._currentCall.id}'`);
            } else {
                debug(moduleName, `call ${this._currentCall.id} terminated`);
            }
            this._currentCall.transitToEndedWithReasonTerminated(ended);
            debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);
        }

        if (shouldSendMessage) {
            const msg = this._currentCall.jsongleze();
            this._transport.sendMessage(msg);
        }

        this.fireOnCallStateChanged();
        this.fireOnCallEnded(shouldSendMessage);
        this.fireOnTicket();

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    trying(triedAt) {
        debug(moduleName, `try call '${this._currentCall.id}'`);
        this._currentCall.transitToTrying(triedAt);
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);
        this.fireOnCallStateChanged();
    }

    abort(reason, abortedAt) {
        debug(moduleName, `abort call '${this._currentCall.id}'`);
        this._currentCall.transitToEndedWithReasonAborted(reason, abortedAt);
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);

        this.fireOnCallStateChanged();
        this.fireOnCallEnded();
        this.fireOnTicket();

        this._callStore.dispatch({ type: CALL_ACTIONS.RELEASE_CALL, payload: {} });
        this._currentCall = null;
    }

    ringing(isNewCall = false, ringingAt) {
        const ringingMsg = this._currentCall.transitToRinging(ringingAt).jsongleze();
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);
        if (isNewCall) {
            debug(moduleName, `send ringing for call '${this._currentCall.id}'`);
            this._transport.sendMessage(ringingMsg);
            this._callStore.dispatch({ type: CALL_ACTIONS.ANSWER_CALL, payload: {} });
            this.fireOnCall();
        } else {
            debug(moduleName, `received ringing for call '${this._currentCall.id}'`);
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
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);

        if (shouldSendMessage) {
            const offerMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(offerMsg);
        } else {
            this.fireOnOfferReceived(offer);
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
    }

    active(shouldSendMessage, activedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send active for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received active for call '${this._currentCall.id}'`);
        }

        this._currentCall.transitToActive(activedAt, shouldSendMessage);
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);

        if (shouldSendMessage) {
            const activeMsg = this._currentCall.jsongleze();
            this._transport.sendMessage(activeMsg);
        }

        this.fireOnCallStateChanged();
    }

    mute(shouldSendMessage, mutedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send muted for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received muted for call '${this._currentCall.id}'`);
        }

        this.currentCall.transitToMuted(mutedAt, shouldSendMessage);
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);

        if (shouldSendMessage) {
            const mutedMsg = this._currentCall.jsongleze(SESSION_INFO_REASON.MUTE);
            this._transport.sendMessage(mutedMsg);
            this.fireOnCallLocalMuted();
        } else {
            this.fireOnCallMuted();
        }

        this.fireOnCallStateChanged();
    }

    unmute(shouldSendMessage, unmutedAt) {
        if (shouldSendMessage) {
            debug(moduleName, `send unmuted for call '${this._currentCall.id}'`);
        } else {
            debug(moduleName, `received unmuted for call '${this._currentCall.id}'`);
        }

        this.currentCall.transitToUnmuted(unmutedAt, shouldSendMessage);
        debug(moduleName, `call state moved to '${this._currentCall.state}' for call '${this._currentCall.id}'`);

        if (shouldSendMessage) {
            const unmutedMsg = this._currentCall.jsongleze(SESSION_INFO_REASON.UNMUTE);
            this._transport.sendMessage(unmutedMsg);
            this.fireOnCallLocalUnmuted();
        } else {
            this.fireOnCallUnmuted();
        }

        this.fireOnCallStateChanged();
    }

    send(shouldSendMessage, msg) {
        if (shouldSendMessage) {
            debug(moduleName, "send msg");
            this._transport.sendMessage(msg);
        } else {
            debug(moduleName, "received msg");
            // acknowledge the message received
            const ackEvent = buildEvent(JSONGLE_ACTIONS.EVENT, msg.from, MESSAGE_EVENTS.ACK, EVENTS_NAMESPACE.MESSAGE, { acknowledged: new Date().toJSON(), mid: msg.id, type: ACK_TYPES.RECEIVED });
            this._transport.sendMessage(ackEvent);

            // Fire the event
            if (msg.jsongle.action === JSONGLE_ACTIONS.CUSTOM) {
                this.fireOnDataMsgReceived(msg);
            } else {
                this.fireOnMsgReceived(msg);
            }
        }
    }

    error(msg) {
        debug(moduleName, "received error msg");
        this.fireOnErrorReceived(msg);
    }

    iq(msg) {
        const { jsongle } = msg;
        const { action, query } = jsongle;
        debug(moduleName, `received ${action} with query ${query}`);

        if (action === JSONGLE_ACTIONS.IQ_GET || action === JSONGLE_ACTIONS.IQ_SET) {
            if (action === JSONGLE_ACTIONS.IQ_GET && query === IQ_QUERY.SESSION_HELLO) {
                // Manage server side identity received
                this._transport.from = msg.to;
            }
            this.fireRequestReceived(msg);
        } else {
            this.fireAnswer(msg);
        }
    }

    event(msg) {
        this.fireOnEvent(msg);
    }

    ack(msg) {
        const { jsongle } = msg;
        const { action } = jsongle;
        debug(moduleName, `received ${action}`);
        this.fireAnswer(msg);
    }

    noop() {
        debug(moduleName, "do nothing - strange!");
    }

    registerCallback(name, callback) {
        if (name in this._callbacks) {
            debug(moduleName, `registered callback '${name}'`);
        } else {
            debug(moduleName, `registered volatile callback '${name}'`);
        }
        this._callbacks[name] = callback;
    }

    unregisterCallback(name) {
        if (name in this._callbacks) {
            this._callbacks[name] = null;
            delete this._callbacks[name];
            debug(moduleName, `unregistered callback '${name}'`);
        } else {
            warn(moduleName, `can't unregister callback for '${name}'`);
        }
    }

    get from() {
        return this._transport.from;
    }

    fireWithParams(fct, ...params) {
        if (fct) {
            fct(...params);
        }
    }

    fireOnCallStateChanged() {
        this.fireWithParams(this._callbacks.oncallstatechanged, this._currentCall.state);
    }

    fireOnCall() {
        this.fireWithParams(this._callbacks.oncall, this._currentCall);
    }

    fireOnCallEnded(isLocal) {
        this.fireWithParams(this._callbacks.oncallended, isLocal);
    }

    fireOnOfferNeeded() {
        this.fireWithParams(this._callbacks.onofferneeded, this._currentCall);
    }

    fireOnOfferReceived(offer) {
        this.fireWithParams(this._callbacks.onofferreceived, this._currentCall, offer, offer.type === "offer");
    }

    fireOnCandidateReceived(candidate) {
        this.fireWithParams(this._callbacks.oncandidatereceived, candidate);
    }

    fireOnTicket() {
        const ticket = this._currentCall.ticketize();
        this.fireWithParams(this._callbacks.onticket, ticket);
    }

    fireOnCallLocalMuted() {
        this.fireWithParams(this._callbacks.onlocalcallmuted, this._currentCall);
    }

    fireOnCallLocalUnmuted() {
        this.fireWithParams(this._callbacks.onlocalcallunmuted, this._currentCall);
    }

    fireOnCallMuted() {
        this.fireWithParams(this._callbacks.oncallmuted, this._currentCall);
    }

    fireOnCallUnmuted() {
        this.fireWithParams(this._callbacks.oncallunmuted, this._currentCall);
    }

    fireOnDataMsgReceived(msg) {
        this.fireWithParams(this._callbacks.ondatareceived, msg.jsongle, msg.from, msg.id);
    }

    fireOnMsgReceived(msg) {
        this.fireWithParams(this._callbacks.onmessagereceived, msg.jsongle, msg.from, msg.id);
    }

    fireOnErrorReceived(msg) {
        this.fireWithParams(this._callbacks.onerror, msg.jsongle, msg.from);
    }

    fireAnswer(msg) {
        if (this._callbacks[msg.jsongle.transaction]) {
            this._callbacks[msg.jsongle.transaction](msg);
            this.unregisterCallback(msg.jsongle.transaction);
        } else {
            warn(moduleName, `no transaction handler ${msg.jsongle.transaction} registered`);
        }
    }

    fireRequestReceived(msg) {
        this.fireWithParams(this._callbacks.onrequest, msg.jsongle, msg.from);
    }

    fireOnEvent(msg) {
        this.fireWithParams(this._callbacks.onevent, msg.jsongle, msg.from);
    }

    get currentCall() {
        return this._currentCall;
    }
}
