import { generateNewId } from "../utils/helper";
import { JSONGLE_ACTIONS, CALL_STATE } from "./jsongle";

const getActionFromState = (state, reason) => {
    switch (state) {
        case CALL_STATE.PROPOSED:
            return JSONGLE_ACTIONS.PROPOSE;
        case CALL_STATE.ENDED:
            if (reason === "retracted") {
                return JSONGLE_ACTIONS.RETRACT;
            }

            if (reason === "terminated") {
                return JSONGLE_ACTIONS.TERMINATE;
            }

            return JSONGLE_ACTIONS.NONE;

        default:
            return JSONGLE_ACTIONS.NONE;
    }
};

export default class Call {
    constructor(caller, callee, media) {
        this._id = generateNewId();
        this._state = CALL_STATE.NEW;
        this._caller = caller;
        this._callee = callee;
        this._media = media;
        this._initiated = new Date();
        this._ended = null;
        this._endedReason = "";
    }

    get id() {
        return this._id;
    }

    get state() {
        return this._state;
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

    get isActive() {
        return this._state === CALL_STATE.ACTIVE;
    }

    get isInProgress() {
        return (
            this._state === CALL_STATE.NEW || this._state === CALL_STATE.TRYING || this._state === CALL_STATE.RINGING
        );
    }

    get isEnded() {
        return this._state === CALL_STATE.ENDED;
    }

    propose() {
        return this;
    }

    trying() {
        this._state = CALL_STATE.TRYING;
        return this;
    }

    retract() {
        this.state = CALL_STATE.ENDED;
        this.ended = new Date();
        this._endedReason = "retracted";
        return this;
    }

    terminate() {
        this.state = CALL_STATE.ENDED;
        this.ended = new Date();
        this._endedReason = "terminated";
        return this;
    }

    abort(reason) {
        this._state = CALL_STATE.ENDED;
        this._endedReason = reason;
        this._ended = new Date();
        return this;
    }

    jsongleze() {
        return {
            id: generateNewId(),
            from: this._caller,
            to: this._callee,
            jsongle: {
                sid: this._id,
                action: getActionFromState(this._state, this._endedReason),
                reason: this._endedReason,
                initiator: this._caller,
                responder: this._callee,
                description: {
                    initiated: this._initiated,
                    ended: this._ended,
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
}
