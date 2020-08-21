import { debug } from "loglevel";
import { handle } from "./TransportHandler";

export default class Transport {
    constructor(transport) {
        if (!transport) {
            throw new Error("Missing 'transport' argument - Object containing the transport properties");
        }
        this._transport = transport.transport;
        this._name = transport.name;

        this._callbacks = {
            oncallstatechanged: null,
        };

        // Define the callback function to use when receiving new messages
        this._transport.in((message) => {
            handle(message);
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

    registerCallback(name, callback) {
        if (name in this._callbacks) {
            this._callbacks[name] = callback;
            debug(`[transport] registered callback ${name}`);
        }
    }
}
