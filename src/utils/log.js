import * as log from "loglevel";

log.setDefaultLevel(log.levels.WARN);

export const setVerboseLog = (shouldHaveVerboseLog) => {
    log.setLevel(shouldHaveVerboseLog ? log.levels.TRACE : log.levels.WARN);
};

const getHeader = () => {
    return "#jsongle";
};

export const debug = (message) => {
    log.debug(`${getHeader()} - ${message}`);
};

export const trace = (message) => {
    log.trace(`${getHeader()} - ${message}`);
};

export const info = (message) => {
    log.info(`${getHeader()} - ${message}`);
};

export const warn = (message) => {
    log.warn(`${getHeader()} - ${message}`);
};

export const error = (message) => {
    log.error(`${getHeader()} - ${message}`);
};
