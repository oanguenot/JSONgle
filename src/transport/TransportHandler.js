import { warn, debug } from "loglevel";

import { ACTIONS } from "../protocol/jsongle";

export const handle = (message) => {
    if (!message.jsongle) {
        warn("[jsongle] can't handle message - not a JSONgle message");
        return;
    }

    // Comment récupérer le current call.
    // Mettre ça dans un module à part qui est accessible (sortir les données de index)

    const { action } = message.jongle;

    debug(`[transport] <-- Received JSONgle action ${action}`);

    switch (action) {
        case ACTIONS.INFO:
            this._callbacks.oncallstatechanged(message);
            break;
        default:
            break;
    }
};
