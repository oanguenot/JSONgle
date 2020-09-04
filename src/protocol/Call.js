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
        case CALL_STATE.ACCEPTED:
            return JSONGLE_ACTIONS.ACCEPT;
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

export default class Call {
    constructor(caller, callee, media, direction, id, initiated) {
        this._id = id || generateNewId();
        this._state = CALL_STATE.NEW;
        this._caller = caller;
        this._callee = callee;
        this._media = media;
        this._direction = direction || CALL_DIRECTION.OUTGOING;
        this._initiated = initiated || new Date();
        this._rang = null;
        this._accepted = null;
        this._active = null;
        this._ended = null;
        this._endedReason = "";
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

    get rangAt() {
        return this._rang;
    }

    set rangAt(value) {
        this._rang = value;
    }

    get acceptedAt() {
        return this._accepted;
    }

    set acceptedAt(value) {
        this._accepted = value;
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
            this._state === CALL_STATE.ACCEPTED ||
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

    isFrom(userId) {
        return this._caller === userId;
    }

    propose() {
        return this;
    }

    trying() {
        this._state = CALL_STATE.TRYING;
        return this;
    }

    ringing() {
        this._state = CALL_STATE.RINGING;
        this._rang = new Date();
        return this;
    }

    activate() {
        this._state = CALL_STATE.ACTIVE;
        this._active = new Date();
        return this;
    }

    retract() {
        this._state = CALL_STATE.ENDED;
        this._ended = new Date();
        this._endedReason = CALL_ENDED_REASON.RETRACTED;
        return this;
    }

    terminate() {
        this._state = CALL_STATE.ENDED;
        this._ended = new Date();
        this._endedReason = CALL_ENDED_REASON.TERMINATED;
        return this;
    }

    abort(reason) {
        this._state = CALL_STATE.ENDED;
        this._endedReason = reason;
        this._ended = new Date();
        return this;
    }

    accept() {
        this._state = CALL_STATE.ACCEPTED;
        this._accepted = new Date();
    }

    decline() {
        this.state = CALL_STATE.ENDED;
        this._endedReason = CALL_ENDED_REASON.DECLINED;
        this._ended = new Date();
    }

    jsongleze() {
        const action = getActionFromState(this._state, this._endedReason);
        const reason = getReasonFromActionAndState(action, this._state);

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
                description: {
                    initiated: this._initiated ? this.initiatedAt.toJSON() : null,
                    rang: this._rang ? this._rang.toJSON() : null,
                    accepted: this._accepted ? this._accepted.toJSON() : null,
                    active: this._active ? this._active.toJSON() : null,
                    ended: this._ended ? this._ended.toJSON() : null,
                    ended_reason: this._endedReason,
                    media: this._media,
                    additional_data: {
                        initiator_name: "",
                        initiator_photo: "",
                        session_object: "",
                    },
                },
            },
        };
    }

    clone() {
        const cloned = new Call(this._caller, this._callee, this._media, this._direction, this._id, this._initiated);

        cloned.state = this._state;
        cloned.rangAt = this._rang;
        cloned.activeAt = this._active;
        cloned.endedAt = this._ended;
        cloned.acceptedAt = this._accepted;
        cloned.endedReason = this._endedReason;

        return cloned;
    }
}
