import * as log from "loglevel";
import { LOG_LEVEL } from "../protocol/jsongle";

// Default log level set to ERROR
log.setDefaultLevel(log.levels.ERROR);

export const setLogLevel = (toLevel) => {
    let newLevel = log.levels.ERROR;

    switch (toLevel) {
        case LOG_LEVEL.NONE:
            newLevel = log.levels.SILENT;
            break;
        case LOG_LEVEL.TRACE:
            newLevel = log.levels.TRACE;
            break;
        case LOG_LEVEL.DEBUG:
            newLevel = log.levels.DEBUG;
            break;
        case LOG_LEVEL.INFO:
            newLevel = log.levels.INFO;
            break;
        case LOG_LEVEL.WARNING:
            newLevel = log.levels.WARN;
            break;
        default:
            break;
    }
    log.setLevel(newLevel);
};

const getHeader = () => `${new Date().toISOString()} | jsongle`;

const format = (header, module, message) => `${header} | ${module} | ${message}`;

export const trace = (name, message) => {
    log.trace(format(getHeader(), name, message));
};

export const debug = (name, message) => {
    log.debug(format(getHeader(), name, message));
};

export const info = (name, message) => {
    log.info(format(getHeader(), name, message));
};

export const warn = (name, message) => {
    log.warn(format(getHeader(), name, message));
};

export const error = (name, message) => {
    log.error(format(getHeader(), name, message));
};
