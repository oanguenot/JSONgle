export const JSONGLE_ACTIONS = {
    PROPOSE: "session-propose",
    INFO: "session-info",
    RETRACT: "session-retract",
    DECLINE: "session-decline",
    PROCEED: "session-proceed",
    ACCEPT: "session-accept",
    INITIATE: "session-initiate",
    TERMINATE: "session-terminate",
    TRANSPORT: "transport-info",
    NONE: "none",
};

export const SESSION_INFO_REASON = {
    UNREACHABLE: "unreachable",
    TRYING: "trying",
    RINGING: "ringing",
    PROPOSED: "proposed",
    DISCONNECTED: "disconnected",
    UNKNOWN_SESSION: "unknown-session",
};

export const CALL_STATE = {
    NEW: "new",
    TRYING: "trying",
    RINGING: "ringing",
    ESTABLISHING: "establishing",
    ACTIVE: "active",
    ENDED: "ended",
    UNKNOWN: "unknown",
};

export const ACTIVITY = {
    FREE: "free",
    BUSY: "busy",
};

export const CALL_DIRECTION = {
    OUTGOING: "outgoing",
    INCOMING: "incoming",
};
