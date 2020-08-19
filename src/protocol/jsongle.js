import { generateNewCallId } from "../utils/helper";

const MESSAGE_TYPE = {
    PROPOSE: "PROPOSE",
};

export const propose = (to, from, media) => {
    return {
        id: generateNewCallId(),
        from: from,
        to: to,
        stamp: new Date(),
        "call-id": generateNewCallId(),
        media: media,
        "message-type": MESSAGE_TYPE.PROPOSE,
        "additional-data": {
            "caller-name": "",
            "caller-photo": "",
            reason: "",
        },
    };
};
