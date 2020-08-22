export const PEER_ACTIONS = {
    SET: "SET",
};

const initialState = {
    peer: null,
};

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case PEER_ACTIONS.SET:
            return { ...state, peer: action.payload.peer };
        default:
            return state;
    }
};
