# WebRTC JSONgle

## Introduction

WebRTC **JSONgle** is a JavaScript library that proposes an agnostic transport implementation based and adapted from the Jingle signaling protocol for WebRTC calls using JSON messages.

Goal is that an application can use its existing server to exchange the signaling messages between peers but relies on **JSONgle** for the content of these messages.

The example provided here is using **Socket.io** as the transport layer. But an abstraction is done to map your existing transport layer to **JSONgle**.

## Signaling and WebRTC

WebRTC needs a signaling server to negotiate with the remote peer about the media and the best path to follow.

In fact, only few information need to be exchanged: a **SDP** and some **ICE Candidates**.

So what **JSONgle** does is to ask for a local SDP in one side and its associated candidates and send them to the remote peer. Then by asking to that remote peer in a same manner his local description and some candidates that are given back to the initial sender. And that all for initializing the call.

Additionally to that, **JSONgle** can transmit information and actions done on the call such as when muting or unmuting the media.

Finally, **JSONgle** computes internally a **Call State** machine that can be retrieved through some events and generates at the end of the communication a **log ticket** that summarizes the call progress and information.

## WebRTC Adapter

Don't forget to install and use [**WebRTC adapter**](https://github.com/webrtcHacks/adapter) in order to help on the managment of WebRTC on different browsers (JavaScript API).


## Install

Using NPM

```bash
$ npm install jsongle
```

Using Yarn

```bash
$ yarn add jsongle
```

## Configuration

**JSONgle** needs to be adapted to the server in use. This step is done by configuring the transport wrapper and the user identity.

### Defining the transport wrapper

Define the transport wrapper using the following pattern:

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

The transport wrapper is in fact a function that embeds the transport used (here socket.io) and that returns an object with 2 properties `in` and `out`:

-   **in**: This property which is a function is used when receiving a message from your transport layer to give it back to **JSONgle** when it should be. Here, we listen to the event name `jsongle` and we execute the callback given with the message received.

-   **out**: This property which is a function too is used when **JSONgle** needs to send a message using your transport layer. This function is called by **JSONgle** with the message to send as an argument. Just take the message and send it using your transport layer.

In that previous sample, the `transport` parameter is in fact an instance of **Socket.IO**. `transport.on` and `transport.emit` are functions offered by **Socket.IO**.

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

_Note_: This `id` is used by JSONgle when generating messages. All messages will have a `from` and `to` field that will contain the `id` of the caller and the callee.

### Initialize JSONgle

Once the configurations are ok, initialize **JSONgle**

```js
import JSONGle from "jsongle";

const jsongle = new JSONGle({
    transport: transportCfg,
    peer: peerCfg,
});
```

## Usage

More information about **JSONgle**:
- [API](./documentation/API.md)
- [Events](./documentation/Events.md)
- [Call Object Model](./documentation/Call-Object-Model.md)
- [Messages](./documentation/Messages.md)

## JSONgle-Server

The **JSONgle** library can be used with the corresponding **JSONgle-Server** NodeJS application which is a signaling server. This server forwards the message to the right recipient and allow to manage the call.

More information are available in the [JSONgle-Server](https://github.com/oanguenot/JSONgle-Server) Github project.
