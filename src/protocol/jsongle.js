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
    NOOP: "noop",
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
    PROCEEDED: "proceeded",
    OFFERING: "offering",
    ACTIVE: "active",
    ENDED: "ended",
    NOOP: "",
};

export const ACTIVITY = {
    FREE: "free",
    BUSY: "busy",
};

export const CALL_DIRECTION = {
    OUTGOING: "outgoing",
    INCOMING: "incoming",
};

export const MEDIA = {
    AUDIO: "audio",
    VIDEO: "video",
    VIDEO_ONLY: "video-only",
};

export const CALL_ENDED_REASON = {
    RETRACTED: "retracted",
    TERMINATED: "terminated",
    DECLINED: "declined",
};
