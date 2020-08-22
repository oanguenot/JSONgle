# JSONgle

## Introduction

**JSONgle** is a JavaScript library that proposes an agnostic transport implementation of the Jingle signaling protocol for WebRTC calls based on JSON messages.

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

Once defined, you can use your transport and define the transport configuration to use.

```js
const io = socketio("<your_host>");

const transportCfg = {
    name: "socket.io",
    transport: transportWrapper(io),
};
```

### Defining the user identity

As now, the identity of the user is used to dispatch the messages from the server.

You can just use any kinds of unique `id` such as the user database identifier.

```js
const peerCfg = {
    id: "43eed341123123",
};
```

### Initialize JSONgle

Once your configuration are ok, you can initialize **JSONgle**

```js
const jsongle = new JSONGle({
    transport: transportCfg,
    peer: peerCfg,
});
```

## API

### Methods

#### Call

#### Decline

#### Accept

#### End

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
    // The call state has changed. Do something with that call
};
```

## Internal Call Flow

### Action 'session-propose'

### Action 'session-info'

#### With reason 'unreachable' (server)

#### With reason 'trying' (server)

#### With reason 'proposed'

### Action 'session-retract'

...To complete
