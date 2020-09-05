# JSONgle

## Introduction

**JSONgle** is a JavaScript library that proposes an agnostic transport implementation based and adapted from the Jingle signaling protocol for WebRTC calls based on JSON messages.

Goal is that an application can use its existing server to exchange the signaling messages between peers but relies on **JSONgle** for the content of these messages.

The exemple provided here is using **Socket.io** as the transport layer. But an abstraction is done to map your existing transport layer to **JSONgle**.

## Configuration

### Defining the transport layer

The first thing you have to do is to define your transport wrapper

```js
const transportWrapper = (transport) => {
    return {
        in: (callback) => {
            transport.on("jsongle", (msg) => {
                callback(msg);
            });
        },
        out: (msg) => {
            transport.emit("jsongle", msg);
        },
    };
};
```

The transport wrapper is in fact a function that embeds your own transport (here socket.io) and that returns an object with 2 properties `in` and `out`:

-   **in**: This property which is a function is used when receiving a message from your transport layer to give it back to **JSONgle** when it should be. Here, we listen to the event name `jsongle` and we execute the callback given with the message received.

-   **out**: This property which is a function too is used when **JSONgle** needs to send a message using your transport layer. This function is called by **JSONgle** with the message to send as an argument. Just taken the message and send it using your transport layer.

_Note_: If your transport layer allows to use custom event name, it is better to send all the **JSONgle** messages in a separate queue to avoid mixing them with your own events.

Once your wrapper has been defined, you can configure your transport.

```js
const io = socketio("<your_host>");

const transportCfg = {
    name: "socket.io",
    transport: transportWrapper(io),
};
```

### Defining the user identity

As now, the identity of the user is used to allow the recipient to identify the caller.

You can use any kinds of unique `id` such as the user database identifier. It will be up to your application to identify that user from your database.

```js
const peerCfg = {
    id: "43eed341123123",
};
```

### Initialize JSONgle

Once the configurations are ok, you can initialize **JSONgle**

```js
const jsongle = new JSONGle({
    transport: transportCfg,
    peer: peerCfg,
});
```

## API

JSONgle offers the following methods and events.

### Methods

#### Call

This method calls a user.

```js
const jsongle = new JSONGle({...});

jsongle.oncall = (call) => {
    // Do something when the call has been initiated
};

// Initiate a new audio call
jsongle.call(id, JSONGle.MEDIA.AUDIO);
```

The mandatory parameter is the identifier of the recipient. Depending on how your server dispatch the message it can be the user id or any information that allows to contact the right recipient.

The method accepts a second optional parameter which is the media used. This is used to alert the recipient about the kind of call you want to initiate. If not provided, the default media used is `MEDIA.AUDIO`.

```js
jsongle.call(id, JSONGle.MEDIA.AUDIO);
```

#### Decline

When call is in `ringing` state and initiated from someone else (`direction` === `JSONgle.DIRECTION.INCOMING`), you have the possibility to decline it.

```js
jsongle.oncallended = (call) => {
    // Do something when the call has been ended
};

jsongle.decline();
```

The call will be ended.

#### Proceed

In the same manner, when the cal is in `ringing` state and initiated from someone else (`direction` === `JSONgle.DIRECTION.INCOMING`), you have the possibility to proceed it.

```js
jsongle.proceed();
```

The call will move to state `proceeded` that will trigger the negotiation step.

#### End

At anytime, an initiated call can be ended by the issuer or the responder. When the call not yet active, the issuer can **retract** it. When the call is active, both can **end** that call.

From the application point of view, only one method is provided that retracts or ends the call.

```js
jsongle.oncallended = (call) => {
    // Do something when the call has been ended
};

// End or retract a call
jsongle.end(call);
```

#### Add or remove a media

### Events

You can subscribe to the following events on the **JSONgle** instance

| Events               | Description                                                                                           |
| :------------------- | :---------------------------------------------------------------------------------------------------- |
| `oncall`             | Fired when a new call has been received or when a call is initiated.<br>The event contains the `Call` |
| `oncallstatechanged` | Fired each time there is an update on the current call.<br>The event contains the `Call`              |
| `oncallended`        | Fired when a call has ended.<br>The event contains the `Call`                                         |

Here is an exemple of registering to an event

```js
jsongle.oncallstatechanged = (call) => {
    // The call state has changed. Do something if needed
};
```

## Internal Call Flow

### Action 'session-propose'

### Action 'session-info'

#### With reason 'unreachable' (server)

#### With reason 'trying' (server)

#### With reason 'proposed'

### Action 'session-retract'

## Call State

A `Call` can have the following states:

| **State**      | **Description**                                                                                                      |
| :------------- | :------------------------------------------------------------------------------------------------------------------- |
| `new`          | Call has just been created                                                                                           |
| `trying`       | Call has been received by the server and is being routed to the remote recipient.<br>Only for the issuer of the call |
| `ringing`      | Call has been received by the remote peer and is being presented<br>Only for the issuer                              |
| `accepted`     | Call has been accepted by the responder                                                                              |
| `establishing` | Call has been accepted by the remote peer and is being established                                                   |
| `active`       | Call is active                                                                                                       |
| `releasing`    | Call is releasing by a peer                                                                                          |
| `ended`        | Call is ended                                                                                                        |

### Call lifecycle from the caller point of view

On the caller side, the `Call` has the following cycle:

`new` -> `trying` -> `ringing` -> `accepted` -> `negotiating` -> `active` -> `releasing` -> `ended`

_Note_: From any state, the `Call` state can move to `ended`.

### Call lifecycle from the callee point of view

On the callee side, the `Call` has the following cycle:

`ringing` -> `accepted` -> `negotiating` -> `active` -> `releasing` -> `ended`

_Note_: From any state, the `Call` state can move to `ended`.

## Messages exchanged

This part lists the messages exchanged during the session

### session-propose

The **session-propose** message is sent to propose a session to a recipient.

```json
{
    "id": "20229102-7f9f-4ef4-87d8-481dd6ef5f85",
    "from": "70001",
    "to": "70002",
    "jsongle": {
        "sid": "3bf74aa9-f41d-40d5-a1d8-e3e614ba4af2",
        "action": "session-propose",
        "reason": "",
        "initiator": "70001",
        "responder": "70002",
        "description": {
            "initiated": "2020-09-05T19:31:34.186Z",
            "media": "audio"
        }
    }
}
```

### session-retract

The **session-retract** message is sent when the issuer want to cancel the call in progress. This message is only sent if the call is not active. Elsewhere a **session-terminate** message is sent.

```json
// to describe
```

### session-decline

The **session-decline** message is sent when the responder wants to decline the call.

```json
// to describe
```

### session-proceed

The **session-proceed** message is sent when the responder wants to proceed the call.

```json
// to describe
```
