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
    PROPOSED: "proposed",
    DISCONNECTED: "disconnected",
    UNKNOWN_SESSION: "unknown-session",
};

export const CALL_STATE = {
    NEW: "new",
    PROPOSED: "proposed",
    TRYING: "trying",
    RINGING: "ringing",
    ACTIVE: "active",
    ENDED: "ended",
};

export const ACTIVITY = {
    FREE: "free",
    BUSY: "busy",
};
