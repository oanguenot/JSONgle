import { info, warn } from "../utils/log";

export const PEER_ACTIONS = {
    SET_PEER: "SET",
};

const initialState = {
    peer: null,
};

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case PEER_ACTIONS.SET_PEER:
            info(`[reducer::peer] execute ${action.type} and set peer to ${JSON.stringify(action.payload.peer)}`);
            return { ...state, peer: action.payload.peer };
        default:
            warn(`[reducer::peer] unhandled action ${action.type}`);
            return state;
    }
};
