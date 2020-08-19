import { warn, debug } from "loglevel";

export default class Transport {
    constructor(transport) {
        if (!transport) {
            throw new TypeError("Missing 'transport' argument - Object containing the transport properties");
        }
        this._transport = transport.transport;
        this._name = transport.name;

        this._callbacks = {
            oncallstatechanged: null,
        };

        // Define the callback function to use when receiving new messages
        this._transport.in((message) => {
            const type = message["message-type"];

            debug(`[transport] <-- Received message type ${type}`);

            switch (type) {
                case "try":
                    if (this._callbacks.oncallstatechanged) {
                        this._callbacks.oncallstatechanged(message);
                    }
                    break;
                default:
                    warn(`[transport] message type ${message.type} is not handled`);
            }
        });
    }

    get name() {
        return this._name;
    }

    sendMessage(message) {
        if (!this._transport.out) {
            throw new TypeError("Missing handler 'out' on transport");
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
