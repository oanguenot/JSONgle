export const ACTIONS = {
    NEW_CALL: "NEW_CALL",
    SET_PEER: "SET_PEER",
};

const initialState = {
    peer: null,
    currentCall: null,
};

export const reducer = (state = initialState, action) => {
    switch (action.type) {
        case ACTIONS.NEW_CALL:
            return { ...state, currentCall: action.payload.call };
        case ACTIONS.SET_PEER:
            return { ...state, peer: action.payload.peer };
        default:
            return state;
    }
};
