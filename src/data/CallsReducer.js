import { info, warn } from "../utils/log";

import { USER_ACTIVITY } from "../protocol/jsongle";

export const CALL_ACTIONS = {
    INITIATE_CALL: "INITIATE-CALL",
    ANSWER_CALL: "ANSWER-CALL",
    RELEASE_CALL: "RELEASE-CALL",
};

const initialState = {
    activity: USER_ACTIVITY.FREE,
};

const moduleName = "reducer:call";

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case CALL_ACTIONS.INITIATE_CALL:
        case CALL_ACTIONS.ANSWER_CALL:
            info(moduleName, `execute action '${action.type}' and set activity '${USER_ACTIVITY.BUSY}'`);
            return { ...state, activity: USER_ACTIVITY.BUSY };
        case CALL_ACTIONS.RELEASE_CALL:
            info(moduleName, `execute action '${action.type}' and set activity '${USER_ACTIVITY.FREE}'`);
            return { ...state, activity: USER_ACTIVITY.FREE };
        case "@@redux/INIT":
            info(moduleName, "initialized successfully");
            return state;
        default:
            warn(moduleName, `unhandled action '${action.type}'`);
            return state;
    }
};
