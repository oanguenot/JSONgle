import { info, warn } from "../utils/log";

export const PEER_ACTIONS = {
    SET_PEER: "SET-PEER",
};

const initialState = {
    peer: null,
};

const moduleName = "reducer:peer";

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case PEER_ACTIONS.SET_PEER:
            info(moduleName, `execute action '${action.type}' for pid '${action.payload.peer.id}'`);
            return { ...state, peer: action.payload.peer };
        case "@@redux/INIT":
            info(moduleName, "initialized successfully");
            return state;
        default:
            warn(moduleName, `unhandled action '${action.type}'`);
            return state;
    }
};
