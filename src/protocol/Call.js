import { generateNewCallId } from "../utils/helper";
import { ACTIONS } from "./jsongle";

export const CALL_STATE = {
    NEW: "new",
};

export default class Call {
    constructor(caller, callee, media) {
        this._id = generateNewCallId();
        this._state = CALL_STATE.NEW;
        this._caller = caller;
        this._callee = callee;
        this._media = media;
        this._initiated = new Date();
    }

    propose() {
        return {
            id: generateNewCallId(),
            from: this._caller,
            to: this._callee,
            jsongle: {
                sid: this._id,
                action: ACTIONS.PROPOSE,
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
}
