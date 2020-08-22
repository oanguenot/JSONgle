import { ACTIVITY } from "../protocol/jsongle";

export const CALL_ACTIONS = {
    INITIATE: "INITIATE-CALL",
    ANSWER: "ANSWER-CALL",
    RELEASE: "RELEASE-CALL",
    SET_PEER: "SET_PEER",
};

const initialState = {
    activity: ACTIVITY.FREE,
};

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case CALL_ACTIONS.INITIATE:
        case CALL_ACTIONS.ANSWER:
            return { ...state, activity: ACTIVITY.BUSY };
        case CALL_ACTIONS.RELEASE:
            return { ...state, activity: ACTIVITY.FREE };
        default:
            return state;
    }
};
