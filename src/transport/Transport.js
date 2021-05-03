import { debug } from "../utils/log";
import { JSONGLE_ACTIONS } from "../protocol/jsongle";

const moduleNameSend = "transport ->";
const moduleNameReceived = "transport <-";

export default class Transport {
    constructor(cfg, callback, context) {
        if (!cfg) {
            throw new Error("Missing 'transport' argument - Object containing the transport properties");
        }
        this._transport = cfg.transport;
        this._name = cfg.name;
        this._from = null;

        // Define the callback function to use when receiving new messages
        this._transport.in((message) => {
            // TODO: check message integrity: has message.action ?
            debug(moduleNameReceived, `receive message ${message.id} with action '${message.jsongle.action}'`);
            callback.call(context, message);
        });
    }

    get name() {
        return this._name;
    }

    get from() {
        return this._from;
    }

    set from(value) {
        this._from = value;
    }

    sendMessage(message) {
        if (!this._transport.out) {
            throw new Error("Missing handler 'out' on transport");
        }
        if (message.action === JSONGLE_ACTIONS.NOOP) {
            throw new Error("Incorrect 'action' - noop");
        }

        const completeMessage = { ...message, from: this._from };

        debug(moduleNameSend, `send message ${completeMessage.id} with action '${completeMessage.jsongle.action}'`);
        this._transport.out(completeMessage);
    }
}
