import { generateNewCallId } from "../utils/helper";

const MESSAGE_TYPE = {
    PROPOSE: "PROPOSE",
};

export const propose = (to, from, media) => ({
    id: generateNewCallId(),
    from,
    to,
    stamp: new Date(),
    "call-id": generateNewCallId(),
    media,
    "message-type": MESSAGE_TYPE.PROPOSE,
    "additional-data": {
        "caller-name": "",
        "caller-photo": "",
        reason: "",
    },
});

export const accept = () => {};
