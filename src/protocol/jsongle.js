import { generateNewId } from "../utils/helper";

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
    CUSTOM: "session-custom",
    IQ_SET: "iq-set",
    IQ_GET: "iq-get",
    IQ_RESULT: "iq-result",
    IQ_ERROR: "iq-error",
    ERROR: "session-error",
    EVENT: "session-event",
    ACK: "ack",
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
    MUTE: "mute",
    UNMUTE: "unmute",
    SEND: "send",
    IQ: "iq",
    ERROR: "error",
    ACK: "ack",
    EVENT: "event",
    NOOP: "noop",
};

export const SESSION_INFO_REASON = {
    UNREACHABLE: "unreachable",
    TRYING: "trying",
    RINGING: "ringing",
    PROPOSED: "proposed",
    DISCONNECTED: "disconnected",
    UNKNOWN_SESSION: "unknown-session",
    ACTIVE: "active",
    MUTE: "mute",
    UNMUTE: "unmute",
};

export const IQ_QUERY = {
    SESSION_HELLO: "session-hello",
};

export const USER_ACTIVITY = {
    FREE: "free",
    BUSY: "busy",
};

export const CALL_STATE = {
    FREE: "free",
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
    SUCCESS: "success",
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
    IS_MUTED_REMOTE: "is-muted-remote",
    IS_MUTED_LOCAL: "is-muted-local",
    IS_MUTED_BOTH_SIDE: "is-muted-both-side",
};

export const CALL_ESTABLISHING_STATE = {
    HAVE_NO_CANDIDATE: "have-no-candidate",
    GOT_LOCAL_CANDIDATE: "got-local-candidate",
    GOT_REMOTE_CANDIDATE: "got-remote-candidate",
};

const stateMachine = {};
stateMachine[CALL_STATE.FREE] = [STATE_ACTIONS.SEND, STATE_ACTIONS.IQ, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];
stateMachine[CALL_STATE.NEW] = [STATE_ACTIONS.TRY, STATE_ACTIONS.PROPOSE, STATE_ACTIONS.UNREACH, STATE_ACTIONS.SEND, STATE_ACTIONS.IQ, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];
stateMachine[CALL_STATE.TRYING] = [STATE_ACTIONS.RING, STATE_ACTIONS.RETRACT, STATE_ACTIONS.SEND, STATE_ACTIONS.IQ, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];
stateMachine[CALL_STATE.RINGING] = [STATE_ACTIONS.DECLINE, STATE_ACTIONS.PROCEED, STATE_ACTIONS.RETRACT, STATE_ACTIONS.SEND, STATE_ACTIONS.IQ, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];
stateMachine[CALL_STATE.PROCEEDED] = [STATE_ACTIONS.INITIATE, STATE_ACTIONS.CANCEL, STATE_ACTIONS.SEND, STATE_ACTIONS.IQ, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];
stateMachine[CALL_STATE.OFFERING] = [STATE_ACTIONS.ACCEPT, STATE_ACTIONS.TRANSPORT, STATE_ACTIONS.ACTIVATE, STATE_ACTIONS.CANCEL, STATE_ACTIONS.SEND, STATE_ACTIONS.IQ, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];
stateMachine[CALL_STATE.ACTIVE] = [STATE_ACTIONS.END, STATE_ACTIONS.ACTIVATE, STATE_ACTIONS.MUTE, STATE_ACTIONS.UNMUTE, STATE_ACTIONS.SEND, STATE_ACTIONS.IQ, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];
stateMachine[CALL_STATE.ENDED] = [STATE_ACTIONS.SEND, STATE_ACTIONS.ERROR, STATE_ACTIONS.ACK, STATE_ACTIONS.EVENT];

export const STATES = stateMachine;

export const getCallStateActionFromSignalingAction = (signalingAction, reason) => {
    switch (signalingAction) {
        case JSONGLE_ACTIONS.PROPOSE:
            return STATE_ACTIONS.PROPOSE;
        case JSONGLE_ACTIONS.INFO:
            switch (reason) {
                case SESSION_INFO_REASON.TRYING:
                    return STATE_ACTIONS.TRY;
                case SESSION_INFO_REASON.RINGING:
                    return STATE_ACTIONS.RING;
                case SESSION_INFO_REASON.UNREACHABLE:
                    return STATE_ACTIONS.UNREACH;
                case SESSION_INFO_REASON.ACTIVE:
                    return STATE_ACTIONS.ACTIVATE;
                case SESSION_INFO_REASON.MUTE:
                    return STATE_ACTIONS.MUTE;
                case SESSION_INFO_REASON.UNMUTE:
                    return STATE_ACTIONS.UNMUTE;
                default:
                    return STATE_ACTIONS.NOOP;
            }
        case JSONGLE_ACTIONS.RETRACT:
            return STATE_ACTIONS.RETRACT;
        case JSONGLE_ACTIONS.DECLINE:
            return STATE_ACTIONS.DECLINE;
        case JSONGLE_ACTIONS.PROCEED:
            return STATE_ACTIONS.PROCEED;
        case JSONGLE_ACTIONS.INITIATE:
            return STATE_ACTIONS.INITIATE;
        case JSONGLE_ACTIONS.ACCEPT:
            return STATE_ACTIONS.ACCEPT;
        case JSONGLE_ACTIONS.TRANSPORT:
            return STATE_ACTIONS.TRANSPORT;
        case JSONGLE_ACTIONS.TERMINATE:
            switch (reason) {
                case CALL_ENDED_REASON.SUCCESS:
                case CALL_ENDED_REASON.EMPTY:
                    return STATE_ACTIONS.END;
                case CALL_ENDED_REASON.CANCELED:
                    return STATE_ACTIONS.CANCEL;
                default:
                    return STATE_ACTIONS.NOOP;
            }
        case JSONGLE_ACTIONS.ERROR:
            return STATE_ACTIONS.ERROR;
        case JSONGLE_ACTIONS.IQ_SET:
        case JSONGLE_ACTIONS.IQ_RESULT:
        case JSONGLE_ACTIONS.IQ_GET:
        case JSONGLE_ACTIONS.IQ_ERROR:
            return STATE_ACTIONS.IQ;
        case JSONGLE_ACTIONS.ACK:
            return STATE_ACTIONS.ACK;
        case JSONGLE_ACTIONS.EVENT:
            return STATE_ACTIONS.EVENT;
        default:
            return STATE_ACTIONS.SEND;
    }
};

export const buildCustom = (action, to, description) => (
    {
        id: generateNewId(),
        to,
        jsongle: {
            action,
            description,
        },
    }
);

export const buildQuery = (action, query, to, description, transaction) => (
    {
        id: generateNewId(),
        to,
        jsongle: {
            action,
            query,
            transaction,
            description,
        },
    }
);
