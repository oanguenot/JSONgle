import { generateNewCallId } from "../utils/helper";
import { JSONGLE_ACTIONS, CALL_STATE } from "./jsongle";

export default class Call {
    constructor(caller, callee, media) {
        this._id = generateNewCallId();
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

    propose() {
        this._state = CALL_STATE.PROPOSED;

        return {
            id: generateNewCallId(),
            from: this._caller,
            to: this._callee,
            jsongle: {
                sid: this._id,
                action: JSONGLE_ACTIONS.PROPOSE,
                reason: "",
                initiator: this._caller,
                responder: this._callee,
                description: {
                    stamp: this._initiated,
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

    abort(reason) {
        this._state = CALL_STATE.ENDED;
        this._endedReason = reason;
        this._ended = new Date();
    }

    trying() {
        this._state = CALL_STATE.TRYING;
    }
}
