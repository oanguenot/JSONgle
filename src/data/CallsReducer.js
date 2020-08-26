import { info, warn } from "../utils/log";

import { ACTIVITY } from "../protocol/jsongle";

export const CALL_ACTIONS = {
    INITIATE_CALL: "INITIATE-CALL",
    ANSWER_CALL: "ANSWER-CALL",
    RELEASE_CALL: "RELEASE-CALL",
};

const initialState = {
    activity: ACTIVITY.FREE,
};

export const reducer = (state = initialState, action) => {
    info(`[reducer::call] execute action ${action.type}`);

    switch (action.type) {
        case CALL_ACTIONS.INITIATE_CALL:
        case CALL_ACTIONS.ANSWER_CALL:
            info(`[reducer::call] execute ${action.type} and set activity to ${ACTIVITY.BUSY}`);
            return { ...state, activity: ACTIVITY.BUSY };
        case CALL_ACTIONS.RELEASE_CALL:
            info(`[reducer::call] execute ${action.type} and set activity to ${ACTIVITY.BUSY}`);
            return { ...state, activity: ACTIVITY.FREE };
        default:
            warn(`[reducer::call] unhandled action ${action.type}`);
            return state;
    }
};
