import * as log from "loglevel";

log.setDefaultLevel(log.levels.WARN);

export const setVerboseLog = (shouldHaveVerboseLog) => {
    log.setLevel(shouldHaveVerboseLog ? log.levels.TRACE : log.levels.WARN);
};

export const debug = (message) => {
    log.debug(message);
};

export const trace = (message) => {
    log.trace(message);
};

export const info = (message) => {
    log.info(message);
};

export const warn = (message) => {
    log.warn(message);
};

export const error = (message) => {
    log.error(message);
};
