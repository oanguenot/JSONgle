import { getLibName, getVersion } from "./utils/helper";

import Transport from "./transport/Transport";
import { propose } from "./protocol/jsongle";
import Peer from "./peer/Peer";

export default class JSONgle {
    constructor(cfg) {
        if (!cfg) {
            throw new TypeError("Argument 'cfg', is missing - 'Object' containing the global configuration");
        }

        this._name = getLibName();
        this._version = getVersion();
        this._transport = new Transport(cfg.transport);
        this._peer = new Peer(cfg.peer);
    }
    get name() {
        return this._name;
    }

    get version() {
        return this._version;
    }

    call(toId, withMedia) {
        const media = withMedia || "audio";

        if (!toId) {
            throw new TypeError("Argument 'toId', is missing - 'String' representing the callee id");
        }

        if (!withMedia) {
            console.log("No 'withMedia' argument specified - use 'audio' (default value)");
        }

        console.log(`>>> Start a new call to ${toId} using ${media}`);

        const msg = propose(toId, this._peer.id, media);

        this._transport.sendMessage(msg);
    }
}
