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

const moduleName = "reducer:call";

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case CALL_ACTIONS.INITIATE_CALL:
        case CALL_ACTIONS.ANSWER_CALL:
            info(moduleName, `execute action '${action.type}' and set activity '${ACTIVITY.BUSY}'`);
            return { ...state, activity: ACTIVITY.BUSY };
        case CALL_ACTIONS.RELEASE_CALL:
            info(moduleName, `execute action '${action.type}' and set activity '${ACTIVITY.FREE}'`);
            return { ...state, activity: ACTIVITY.FREE };
        case "@@redux/INIT":
            info(moduleName, "initialized successfully");
            return state;
        default:
            warn(moduleName, `unhandled action '${action.type}'`);
            return state;
    }
};
