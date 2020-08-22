import { debug } from "loglevel";

export default class Transport {
    constructor(cfg, callback, context) {
        if (!cfg) {
            throw new Error("Missing 'transport' argument - Object containing the transport properties");
        }
        this._transport = cfg.transport;
        this._name = cfg.name;

        // Define the callback function to use when receiving new messages
        this._transport.in((message) => {
            // TODO: check message integerity: has message.action ?
            debug(`[transport] <-- Received JSONgle action ${message.action}`);
            callback.call(context, message);
        });
    }

    get name() {
        return this._name;
    }

    sendMessage(message) {
        if (!this._transport.out) {
            throw new Error("Missing handler 'out' on transport");
        }
        debug(`[transport] --> Send message ${message["message-type"]}`);
        this._transport.out(message);
    }
}
