import { generateNewId } from "../utils/helper";
import { JSONGLE_ACTIONS, CALL_STATE, CALL_DIRECTION, CALL_ENDED_REASON } from "./jsongle";

const getActionFromState = (state, reason) => {
    switch (state) {
        case CALL_STATE.NEW:
            return JSONGLE_ACTIONS.PROPOSE;
        case CALL_STATE.ENDED:
            if (reason === CALL_ENDED_REASON.RETRACTED) {
                return JSONGLE_ACTIONS.RETRACT;
            }

            if (reason === CALL_ENDED_REASON.TERMINATED) {
                return JSONGLE_ACTIONS.TERMINATE;
            }

            if (reason === CALL_ENDED_REASON.DECLINED) {
                return JSONGLE_ACTIONS.DECLINE;
            }

            return JSONGLE_ACTIONS.NONE;
        case CALL_STATE.RINGING:
            return JSONGLE_ACTIONS.INFO;
        case CALL_STATE.PROCEEDED:
            return JSONGLE_ACTIONS.PROCEED;
        case CALL_STATE.NEGOTIATING:
            return JSONGLE_ACTIONS.INITIATE;
        case CALL_STATE.NEGOTIATED:
            return JSONGLE_ACTIONS.ACCEPT;
        case CALL_STATE.ESTABLISHING:
            return JSONGLE_ACTIONS.TRANSPORT;
        default:
            return JSONGLE_ACTIONS.NONE;
    }
};

const getReasonFromActionAndState = (action, state) => {
    switch (action) {
        case JSONGLE_ACTIONS.INFO:
            if (state === CALL_STATE.RINGING) {
                return CALL_STATE.RINGING;
            }
            return CALL_STATE.NOOP;
        default:
            return CALL_STATE.NOOP;
    }
};

const getDescriptionFromAction = (context, action) => {
    switch (action) {
        case JSONGLE_ACTIONS.PROPOSE:
            return {
                initiated: context._initiated ? context._initiated.toJSON() : null,
                media: context._media,
            };
        case JSONGLE_ACTIONS.RETRACT:
        case JSONGLE_ACTIONS.TERMINATE:
        case JSONGLE_ACTIONS.DECLINE:
            return {
                ended: context._ended ? context._ended.toJSON() : null,
                ended_reason: context._endedReason,
            };
        case JSONGLE_ACTIONS.INFO:
            if (context._state === CALL_STATE.RINGING) {
                return {
                    rang: context._rang ? context._rang.toJSON() : null,
                };
            }
            return {};
        case JSONGLE_ACTIONS.PROCEED:
            return {
                proceeded: context._proceeded ? context._proceeded.toJSON() : null,
            };
        case JSONGLE_ACTIONS.INITIATE:
            return {
                negotiating: context._negotiating ? context._negotiating.toJSON() : null,
                offer: context._localOffer,
            };
        case JSONGLE_ACTIONS.ACCEPT:
            return {
                negotiated: context._negotiated ? context._negotiated.toJSON() : null,
                answer: context._localOffer,
            };
        case JSONGLE_ACTIONS.TRANSPORT:
            const [candidate] = context._candidates.slice(-1);

            return {
                establishing: context._establishing ? context._establishing.toJSON() : null,
                candidate,
            };
        default:
            return {};
    }
};

export default class Call {
    constructor(caller, callee, media, direction, id, initiated) {
        this._id = id || generateNewId();
        this._state = CALL_STATE.NEW;
        this._caller = caller;
        this._callee = callee;
        this._media = media;
        this._direction = direction || CALL_DIRECTION.OUTGOING;
        this._initiated = initiated || new Date();
        this._tried = null;
        this._rang = null;
        this._proceeded = null;
        this._negotiating = null;
        this._negotiated = null;
        this._establishing = null;
        this._active = null;
        this._ended = null;
        this._endedReason = "";
        this._localOffer = null;
        this._remoteOffer = null;
        this._candidates = [];
        this._remoteCandidates = [];
    }

    get id() {
        return this._id;
    }

    get state() {
        return this._state;
    }

    set state(value) {
        this._state = value;
    }

    get caller() {
        return this._caller;
    }

    get callee() {
        return this._callee;
    }

    get media() {
        return this._media;
    }

    get endedAt() {
        return this._ended;
    }

    set endedAt(value) {
        this._ended = value;
    }

    get initiatedAt() {
        return this._initiated;
    }

    get triedAt() {
        return this._tried;
    }

    set triedAt(value) {
        this._tried = value;
    }

    get rangAt() {
        return this._rang;
    }

    set rangAt(value) {
        this._rang = value;
    }

    get proceededAt() {
        return this._proceeded;
    }

    set proceededAt(value) {
        this._proceeded = value;
    }

    get negotiatingAt() {
        return this._negotiating;
    }

    set negotiatingAt(value) {
        this._negotiating = value;
    }

    get negotiatedAt() {
        return this._negotiated;
    }

    set negotiatedAt(value) {
        this._negotiated = value;
    }

    get establishingAt() {
        return this._establishing;
    }

    set establishingAt(value) {
        this._establishing = value;
    }

    get activeAt() {
        return this._active;
    }

    set activeAt(value) {
        this._active = value;
    }

    get endedReason() {
        return this._endedReason;
    }

    set endedReason(value) {
        this._endedReason = value;
    }

    get isActive() {
        return this._state === CALL_STATE.ACTIVE;
    }

    get isInProgress() {
        return (
            this._state === CALL_STATE.NEW ||
            this._state === CALL_STATE.TRYING ||
            this._state === CALL_STATE.RINGING ||
            this._state === CALL_STATE.PROCEEDED ||
            this._state === CALL_STATE.NEGOTIATING ||
            this._state === CALL_STATE.NEGOTIATED ||
            this._state === CALL_STATE.ESTABLISHING
        );
    }

    get isEnded() {
        return this._state === CALL_STATE.ENDED;
    }

    get outgoing() {
        return this._direction === CALL_DIRECTION.OUTGOING;
    }

    get direction() {
        return this._direction;
    }

    get localOffer() {
        return this._localOffer;
    }

    set localOffer(value) {
        this._localOffer = value;
    }

    get remoteOffer() {
        return this._remoteOffer;
    }

    set remoteOffer(value) {
        this._remoteOffer = value;
    }

    isFrom(userId) {
        return this._caller === userId;
    }

    propose() {
        return this;
    }

    trying(triedAt) {
        this._state = CALL_STATE.TRYING;
        this._tried = triedAt;
        return this;
    }

    ringing(ringingAt) {
        this._state = CALL_STATE.RINGING;
        this._rang = ringingAt;
        return this;
    }

    activate(activateAt) {
        this._state = CALL_STATE.ACTIVE;
        this._active = activateAt;
        return this;
    }

    retract(endedAt) {
        this._state = CALL_STATE.ENDED;
        this._ended = endedAt;
        this._endedReason = CALL_ENDED_REASON.RETRACTED;
        return this;
    }

    terminate(endedAt) {
        this._state = CALL_STATE.ENDED;
        this._ended = endedAt;
        this._endedReason = CALL_ENDED_REASON.TERMINATED;
        return this;
    }

    abort(reason, abortedAt) {
        this._state = CALL_STATE.ENDED;
        this._endedReason = reason;
        this._ended = abortedAt;
        return this;
    }

    proceed(proceededAt) {
        this._state = CALL_STATE.PROCEEDED;
        this._proceeded = proceededAt;
        return this;
    }

    decline(declinedAt) {
        this._state = CALL_STATE.ENDED;
        this._endedReason = CALL_ENDED_REASON.DECLINED;
        this._ended = declinedAt;
        return this;
    }

    setLocalOffer(offer) {
        this._localOffer = offer;
    }

    setRemoteOffer(offer) {
        this._remoteOffer = offer;
    }

    offer(offeredAt) {
        this._state = CALL_STATE.NEGOTIATING;
        this._negotiating = offeredAt;
        return this;
    }

    answer(answeredAt) {
        this._state = CALL_STATE.NEGOTIATED;
        this._negotiated = answeredAt;
        return this;
    }

    establish(candidate, establishingAt, isLocalCandidate = true) {
        if (this._state !== CALL_STATE.ESTABLISHING) {
            this._state = CALL_STATE.ESTABLISHING;
            this._establishing = establishingAt;
        }

        if (isLocalCandidate) {
            this._candidates.push(candidate);
        } else {
            this._remoteCandidates.push(candidate);
        }

        return this;
    }

    jsongleze() {
        const action = getActionFromState(this._state, this._endedReason);
        const reason = getReasonFromActionAndState(action, this._state);
        const description = getDescriptionFromAction(this, action);

        return {
            id: generateNewId(),
            from: this.outgoing ? this._caller : this._callee,
            to: this.outgoing ? this._callee : this._caller,
            jsongle: {
                sid: this._id,
                action,
                reason,
                initiator: this._caller,
                responder: this._callee,
                description,
                // additional_data: {
                //     initiator_name: "",
                //     initiator_photo: "",
                //     session_object: "",
                // },
            },
        };
    }

    clone() {
        const cloned = new Call(this._caller, this._callee, this._media, this._direction, this._id, this._initiated);

        cloned.state = this._state;
        cloned.triedAt = this._tried;
        cloned.rangAt = this._rang;
        cloned.proceededAt = this._proceeded;
        cloned.negotiatingAt = this._negotiating;
        cloned.negotiatedAt = this._negotiated;
        cloned.establishingAt = this._establishing;
        cloned.activeAt = this._active;
        cloned.endedAt = this._ended;
        cloned.endedReason = this._endedReason;
        cloned.localOffer = this._localOffer;
        cloned.remoteOffer = this._remoteOffer;
        return cloned;
    }
}
