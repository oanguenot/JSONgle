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

export const STATE_ACTIONS = {
    TRY: "try",
    PROPOSE: "propose",
    RING: "ring",
    DECLINE: "decline",
    PROCEED: "proceed",
    RETRACT: "retract",
    UNREACH: "unreach",
    INITIATE: "initiate",
    TRANSPORT: "transport",
    ACCEPT: "accept",
    ACTIVATE: "activate",
    CANCEL: "cancel",
    ABORTED: "aborted",
    END: "end",
};

export const SESSION_INFO_REASON = {
    UNREACHABLE: "unreachable",
    TRYING: "trying",
    RINGING: "ringing",
    PROPOSED: "proposed",
    DISCONNECTED: "disconnected",
    UNKNOWN_SESSION: "unknown-session",
    ACTIVE: "active",
};

export const USER_ACTIVITY = {
    FREE: "free",
    BUSY: "busy",
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

export const CALL_DIRECTION = {
    OUTGOING: "outgoing",
    INCOMING: "incoming",
};

export const CALL_MEDIA = {
    AUDIO: "audio",
    VIDEO: "video",
    VIDEO_ONLY: "video-only",
};

export const CALL_ENDED_REASON = {
    EMPTY: "",
    CLEAR: "clear",
    RETRACTED: "retracted",
    TERMINATED: "terminated",
    DECLINED: "declined",
    CANCELED: "canceled",
};

export const CALL_OFFERING_STATE = {
    HAVE_NONE: "have-none",
    HAVE_OFFER: "have-offer",
    HAVE_ANSWER: "have-answer",
    HAVE_BOTH: "have-both",
};

export const CALL_ACTIVE_STATE = {
    IS_NOT_ACTIVE: "is-not-active",
    IS_ACTIVE_LOCAL: "is-active-local",
    IS_ACTIVE_REMOTE: "is-active-remote",
    IS_ACTIVE_BOTH_SIDE: "is-active-both-side",
};

export const CALL_ESTABLISHING_STATE = {
    HAVE_NO_CANDIDATE: "have-no-candidate",
    GOT_LOCAL_CANDIDATE: "got-local-candidate",
    GOT_REMOTE_CANDIDATE: "got-remote-candidate",
};

const stateMachine = {};
stateMachine[CALL_STATE.NEW] = [STATE_ACTIONS.TRY, STATE_ACTIONS.PROPOSE, STATE_ACTIONS.UNREACH];
stateMachine[CALL_STATE.TRYING] = [STATE_ACTIONS.RING, STATE_ACTIONS.RETRACT];
stateMachine[CALL_STATE.RINGING] = [STATE_ACTIONS.DECLINE, STATE_ACTIONS.PROCEED, STATE_ACTIONS.RETRACT];
stateMachine[CALL_STATE.PROCEEDED] = [STATE_ACTIONS.INITIATE, STATE_ACTIONS.CANCEL];
stateMachine[CALL_STATE.OFFERING] = [
    STATE_ACTIONS.ACCEPT,
    STATE_ACTIONS.TRANSPORT,
    STATE_ACTIONS.ACTIVATE,
    STATE_ACTIONS.CANCEL,
];
stateMachine[CALL_STATE.ACTIVE] = [STATE_ACTIONS.CLEAR];
stateMachine[CALL_STATE.ENDED] = [];

export const STATES = stateMachine;
