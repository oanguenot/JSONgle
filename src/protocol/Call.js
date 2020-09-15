import { generateNewId } from "../utils/helper";
import {
    JSONGLE_ACTIONS,
    CALL_STATE,
    CALL_DIRECTION,
    CALL_ENDED_REASON,
    CALL_OFFERING_STATE,
    CALL_ACTIVE_STATE,
    CALL_ESTABLISHING_STATE,
} from "./jsongle";

const getActionFromStateAndStep = (state, endedReason, offeringState, establishingState) => {
    switch (state) {
        case CALL_STATE.NEW:
            return JSONGLE_ACTIONS.PROPOSE;
        case CALL_STATE.ENDED:
            if (endedReason === CALL_ENDED_REASON.RETRACTED) {
                return JSONGLE_ACTIONS.RETRACT;
            }

            if (endedReason === CALL_ENDED_REASON.TERMINATED) {
                return JSONGLE_ACTIONS.TERMINATE;
            }

            if (endedReason === CALL_ENDED_REASON.DECLINED) {
                return JSONGLE_ACTIONS.DECLINE;
            }

            return JSONGLE_ACTIONS.NOOP;
        case CALL_STATE.RINGING:
            return JSONGLE_ACTIONS.INFO;
        case CALL_STATE.PROCEEDED:
            return JSONGLE_ACTIONS.PROCEED;
        case CALL_STATE.OFFERING:
            if (establishingState === CALL_ESTABLISHING_STATE.GOT_LOCAL_CANDIDATE) {
                return JSONGLE_ACTIONS.TRANSPORT;
            }
            if (offeringState === CALL_OFFERING_STATE.HAVE_OFFER) {
                return JSONGLE_ACTIONS.INITIATE;
            }
            if (offeringState === CALL_OFFERING_STATE.HAVE_ANSWER) {
                return JSONGLE_ACTIONS.ACCEPT;
            }
            return JSONGLE_ACTIONS.NOOP;
        case CALL_STATE.ACTIVE:
            return JSONGLE_ACTIONS.INFO;
        default:
            return JSONGLE_ACTIONS.NOOP;
    }
};

const getReasonFromActionAndState = (action, state) => {
    switch (action) {
        case JSONGLE_ACTIONS.INFO:
            return state;
        default:
            return CALL_STATE.NOOP;
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
        this._offering = null;
        this._offered = null;
        this._offeringState = CALL_OFFERING_STATE.HAVE_NONE;
        this._establishing = null;
        this._establishingState = CALL_ESTABLISHING_STATE.HAVE_NO_CANDIDATE;
        this._active = null;
        this._activeState = CALL_ACTIVE_STATE.IS_NOT_ACTIVE;
        this._ended = null;
        this._endedReason = CALL_ENDED_REASON.EMPTY;
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

    get offeringAt() {
        return this._offering;
    }

    set offeringAt(value) {
        this._offering = value;
    }

    get offeredAt() {
        return this._offered;
    }

    set offeredAt(value) {
        this._offered = value;
    }

    get offeringState() {
        return this._offeringState;
    }

    set offeringState(value) {
        this._offeringState = value;
    }

    get establishingAt() {
        return this._establishing;
    }

    set establishingAt(value) {
        this._establishing = value;
    }

    get establishingState() {
        return this._establishingState;
    }

    set establishingState(value) {
        this._establishingState = value;
    }

    get activeAt() {
        return this._active;
    }

    set activeAt(value) {
        this._active = value;
    }

    get activeState() {
        return this._activeState;
    }

    set activeState(value) {
        this._activeState = value;
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
            this._state === CALL_STATE.OFFERING
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

    get localCandidates() {
        return this._candidates;
    }

    set localCandidates(value) {
        this._candidates = value;
    }

    get remoteCandidates() {
        return this._remoteCandidates;
    }

    set remoteCandidates(value) {
        this._remoteCandidates = value;
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
        this._state = CALL_STATE.OFFERING;
        this._offering = offeredAt;
        this._offeringState = CALL_OFFERING_STATE.HAVE_OFFER;
        return this;
    }

    answer(answeredAt) {
        this._offered = answeredAt;
        if (this._offeringState === CALL_OFFERING_STATE.HAVE_ANSWER) {
            this._offeringState = CALL_OFFERING_STATE.HAVE_BOTH;
        } else {
            this._offeringState = CALL_OFFERING_STATE.HAVE_ANSWER;
        }

        return this;
    }

    establish(candidate, establishingAt, isLocalCandidate = true) {
        if (!this._establishing) {
            this._establishing = establishingAt;
        }

        if (!isLocalCandidate) {
            this._establishingState = CALL_ESTABLISHING_STATE.GOT_REMOTE_CANDIDATE;
        } else {
            this._establishingState = CALL_ESTABLISHING_STATE.GOT_LOCAL_CANDIDATE;
        }

        if (isLocalCandidate) {
            this._candidates.push(candidate);
        } else {
            this._remoteCandidates.push(candidate);
        }

        return this;
    }

    active(activedAt, isLocal) {
        if (!this._active) {
            this._active = activedAt;
        }

        this._state = CALL_STATE.ACTIVE;
        if (
            this._activeState !== CALL_ACTIVE_STATE.IS_ACTIVE_LOCAL &&
            this._activeState !== CALL_ACTIVE_STATE.IS_ACTIVE_REMOTE
        ) {
            if (isLocal) {
                this._activeState = CALL_ACTIVE_STATE.IS_ACTIVE_LOCAL;
            } else {
                this._activeState = CALL_ACTIVE_STATE.IS_ACTIVE_REMOTE;
            }
        } else {
            this._activeState = CALL_ACTIVE_STATE.IS_ACTIVE_BOTH_SIDE;
        }

        return this;
    }

    getDescriptionFromAction(action) {
        switch (action) {
            case JSONGLE_ACTIONS.PROPOSE:
                return {
                    initiated: this._initiated ? this._initiated.toJSON() : null,
                    media: this._media,
                };
            case JSONGLE_ACTIONS.RETRACT:
            case JSONGLE_ACTIONS.TERMINATE:
            case JSONGLE_ACTIONS.DECLINE:
                return {
                    ended: this._ended ? this._ended.toJSON() : null,
                };
            case JSONGLE_ACTIONS.INFO:
                if (this._state === CALL_STATE.RINGING) {
                    return {
                        rang: this._rang ? this._rang.toJSON() : null,
                    };
                }

                if (this._state === CALL_STATE.ACTIVE) {
                    return {
                        actived: this._active ? this._active.toJSON() : null,
                    };
                }
                return {};
            case JSONGLE_ACTIONS.PROCEED:
                return {
                    proceeded: this._proceeded ? this._proceeded.toJSON() : null,
                };
            case JSONGLE_ACTIONS.INITIATE:
                return {
                    offering: this._offering ? this._offering.toJSON() : null,
                    offer: this._localOffer,
                };
            case JSONGLE_ACTIONS.ACCEPT:
                return {
                    offered: this._offered ? this._offered.toJSON() : null,
                    answer: this._localOffer,
                };
            case JSONGLE_ACTIONS.TRANSPORT:
                const [candidate] = this._candidates.slice(-1);

                return {
                    establishing: this._establishing ? this._establishing.toJSON() : null,
                    candidate,
                };
            default:
                return {};
        }
    }

    jsongleze() {
        const action = getActionFromStateAndStep(
            this._state,
            this._endedReason,
            this._offeringState,
            this._establishingState
        );
        const reason = getReasonFromActionAndState(action, this._state);
        const description = this.getDescriptionFromAction(action);

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

    ticketize() {
        return {
            sid: this._id,
            initiator: this._caller,
            responder: this._callee,
            direction: this._direction,
            media: this._media,
            state: this._state,
            triedAt: this._tried,
            rangAt: this._rang,
            proceededAt: this._proceeded,
            offeringAt: this._offering,
            offeredAt: this._offered,
            offeringState: this._offeringState,
            establishingAt: this._establishing,
            establishingState: this._establishingState,
            activeAt: this._active,
            activeState: this._activeState,
            endedAt: this._ended,
            endedReason: this._endedReason,
            localOffer: this._localOffer,
            remoteOffer: this._remoteOffer,
            localCandidates: this._candidates,
            remoteCandidates: this._remoteCandidates,
        };
    }

    clone() {
        const cloned = new Call(this._caller, this._callee, this._media, this._direction, this._id, this._initiated);

        cloned.state = this._state;
        cloned.triedAt = this._tried;
        cloned.rangAt = this._rang;
        cloned.proceededAt = this._proceeded;
        cloned.offeringAt = this._offering;
        cloned.offeringState = this._offeringState;
        cloned.offeredAt = this._offered;
        cloned.establishingAt = this._establishing;
        cloned.establishingState = this._establishingState;
        cloned.activeAt = this._active;
        cloned.activeState = this._activeState;
        cloned.endedAt = this._ended;
        cloned.endedReason = this._endedReason;
        cloned.localOffer = this._localOffer;
        cloned.remoteOffer = this._remoteOffer;
        cloned.candidates = this._candidates;
        cloned.remoteCandidates = this._remoteCandidates;

        return cloned;
    }
}
