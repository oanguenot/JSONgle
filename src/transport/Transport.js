export default class Transport {
    constructor(transport) {
        if (!transport) {
            throw new TypeError("Missing 'transport' argument - Object containing the transport properties");
        }
        this._transport = transport.transport;
        this._name = transport.name;

        // Define the callback function to use when receiving new messages
        //this._transport.in((message) => {});
        this._transport.in(this.onMessageReceived);
    }

    get name() {
        return this._name;
    }

    sendMessage(message) {
        if (!this._transport.out) {
            throw new TypeError("Missing handler 'out' on transport");
        }
        console.log("[TRANSPORT] --> Send message", message);
        this._transport.out(message);
    }

    onMessageReceived(message) {
        console.log("[TRANSPORT] <-- Received message", message);
    }
}
