import { v4 as uuidv4 } from "uuid";

export const getLibName = () => {
    return "JSONgle";
};

export const getVersion = () => {
    return "1.0.1";
};

export const generateNewCallId = () => {
    return uuidv4();
};
