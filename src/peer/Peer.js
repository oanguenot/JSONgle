export default class Peer {
    constructor(peer) {
        this._peer = peer;
    }

    get id() {
        if (!this._peer) {
            throw new Error("Missing 'peer' argument - Object representing the user");
        }

        if (!this._peer.id) {
            throw new Error("Missing 'id' parameter in Peer - String identifying the peer");
        }

        return this._peer.id;
    }
}
