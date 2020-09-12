# JSONgle

## Introduction

**JSONgle** is a JavaScript library that proposes an agnostic transport implementation based and adapted from the Jingle signaling protocol for WebRTC calls based on JSON messages.

Goal is that an application can use its existing server to exchange the signaling messages between peers but relies on **JSONgle** for the content of these messages.

The exemple provided here is using **Socket.io** as the transport layer. But an abstraction is done to map your existing transport layer to **JSONgle**.

## Signaling and WebRTC

WebRTC needs a signaling way to negotiate with the remote peer about the media and the best path to follow.

In fact, only few information need to be exchanged: a **SDP** and some **ICE Candidates**.

So what **JSONgle** does is to ask for a local SDP in one side and its associated candidates and send them to the remote peer and by asking to that remote peer in a same maner his local description and some candidates that are given back to the initial sender. And that all!

Additionnaly to that, **JSONgle** computes internally a **Call State** machine that can be retrieved throught some events and generate at the end of the communication a **log ticket** that summarize the evolution of that call. (to come).

## Configuration

In order to adapt **JSONgle** to your own server, you need to do some configuration.

### Defining the transport layer

The first thing you have to do is to define your transport wrapper by using the following pattern:

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

In that previous sample, the `transport` parameter is in fact an instance of **Socket.IO**. `transport.on` and `transport.emit` are function from **Socket.IO**.

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

The mandatory parameter is the identifier of the recipient. Depending on how your server dispatch the message it can be the user id or any information that allows to contact the right recipient. This information will be used to fill the field `to` in the message sent. The `from` will contain your id as defined in the user identity paragraph.

The method accepts a second optional parameter which is the media used. This is used to alert the recipient about the kind of call you want to initiate. If not provided, the default media used is `MEDIA.AUDIO`.

```js
jsongle.call(id, JSONGle.MEDIA.AUDIO);
```

#### Decline

When call is ringing (`state` === `ringing`) and initiated from someone else (`direction` === `JSONgle.DIRECTION.INCOMING`), you have the possibility to decline it.

```js
jsongle.oncallended = (call) => {
    // Do something when the call has been ended
};

jsongle.decline();
```

A message will be sent to the initiator and the call will be ended (`state` === `ended`).

#### Proceed

In the same manner, when the call is ringing (`state`=== `ringing`) and initiated from someone else (`direction` === `JSONgle.DIRECTION.INCOMING`), you have the possibility to proceed it which means you want to answer the call.

```js
jsongle.oncallstatechanged = (call) => {
    // Do something when the call state has changed
};

jsongle.proceed();
```

A message will be sent to the initiator and the call will move to state `proceeded` that will trigger the negotiation step one step further.

#### End

At anytime, an initiated call can be ended by the issuer or the responder. When the call not yet active, the issuer can **retract** it. When the call is active, both can **end** that call.

From the application point of view, only one method is provided that retracts or ends the call depending on its internal state.

```js
jsongle.oncallended = (call) => {
    // Do something when the call has been ended
};

// End or retract a call
jsongle.end();
```

#### Send and receive offer

If the call has been proceeded, the WebRTC negotiation starts and the **JSONgle** library will send the event `onofferneeded` when it needs the local SDP to send it to the remote peer.

Once you have to do, is to obtain that SDP (aka **local description**) from your WebRTC stack and to give it to **JSONgle** by using the method `sendOffer` as follow

```js
// Your Peer Connection with the correct configuration
const pc = new RTCPeerConnection({...});

// Your camera/mic constraints
const constraints = {...};

jsongle.onofferneeded = async (call) => {
    // Got the local stream from your camera/mic
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
    }

    const localDescription = await pc.setLocalDescription();
    jsongle.sendOffer(localDescription);
};
```

In the same way, when the remote recipient sends his SDP (his local description), **JSONGle** fires an event with that description in order for your application to give it to the WebRTC stack. Here is the minimum to do

```js

jsongle.onofferreceived = (remoteDescription) {
    pc.setRemoteDescription(remoteDescription);
}

```

#### Send and receive ICE candidates

ICE candidates should be exchanged the same way between the two peers.

The first part of the job is when the `RTCPeerConnection` generates new ICE candidates, you need to give them to **JSONgle** by calling the method `sendCandidate` by doing something like that:

```js
pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
        jsongle.sendCandidate(candidate);
    }
};
```

**JSONgle** will send each ICE candidate to the remote peer.

In the opposite, when the remote peer sends to you an ICE candidate, you need to listen to the event `oncandidatereceived` to get that candidate and give it to the WebRTC stack like that:

```js
jsongle.oncandidatereceived = async (candidate) => {
    await pc.addIceCandidate(candidate);
};
```

### Events

You can subscribe to the following events on the **JSONgle** instance

| Events                | Description                                                                                                                                                                                                                                 |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `oncall`              | Fired when a new call has been received or when a call is initiated.<br>The event contains the `Call`                                                                                                                                       |
| `oncallstatechanged`  | Fired each time there is an update on the current call.<br>The event contains the `Call`                                                                                                                                                    |
| `oncallended`         | Fired when a call has ended.<br>The event contains the `Call`                                                                                                                                                                               |
| `onofferneeded`       | Fired when a call needs a SDP offer.<br>The event contains the `Call`<br>The application should get the local description (SDP) and answer as soon as possible by calling the method `sendOffer` with the offer generated from the browser. |
| `onofferreceived`     | Fired when a call received a SDP offer.<br>The event contains the `RTCSessionDescription` received from the recipient.<br>The application should give that offer to the `RTCPeerConnection`.                                                |
| `oncandidatereceived` | Fired when a call received an ICE candidate.<br>The event contains the `RTCIceCandidate` received from the recipient.<br>The application should give that candidate to the `RTCPeerConnection`.                                             |

Here is an exemple of registering to an event

```js
jsongle.oncallstatechanged = (call) => {
    // The call state has changed. Do something if needed
};
```

## Call State

A `Call` can have the following states:

| **State**   | **Description**                                                                                                      |
| :---------- | :------------------------------------------------------------------------------------------------------------------- |
| `new`       | Call has just been created                                                                                           |
| `trying`    | Call has been received by the server and is being routed to the remote recipient.<br>Only for the issuer of the call |
| `ringing`   | Call has been received by the remote peer and is being presented<br>Only for the issuer                              |
| `accepted`  | Call has been accepted by the responder                                                                              |
| `offering`  | Call has been accepted by the remote peer and is being negotiated                                                    |
| `active`    | Call is active                                                                                                       |
| `releasing` | Call is releasing by a peer                                                                                          |
| `ended`     | Call is ended                                                                                                        |

### Call lifecycle from the caller point of view

On the caller side, the `Call` has the following cycle:

`new` -> `trying` -> `ringing` -> `accepted` -> `offering` -> `active` -> `releasing` -> `ended`

_Note_: From any state, the `Call` state can move to `ended`.

### Call lifecycle from the callee point of view

On the callee side, the `Call` has the following cycle:

`ringing` -> `accepted` -> `offering` -> `active` -> `releasing` -> `ended`

_Note_: From any state, the `Call` state can move to `ended`.

## Messages exchanged

This part lists the messages exchanged during the session

### session-propose

The **session-propose** message is sent to propose a session (a call) to a recipient.

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

### session-info - trying

When a call is initiated to a remote peer, the server could answer to the initiator by a message of type **session-info** containing a `reason=trying` in order to inform the initiator that his call has been successfully handled and is 'in transit'.

```json
{
    "id": "3fab1209-fb00-494f-82e4-855185a8cba6",
    "from": "server",
    "to": "70001",
    "jsongle": {
        "sid": "678403f4-7b1f-4ea5-84cb-c6699a91db22",
        "action": "session-info",
        "reason": "trying",
        "initiator": "70001",
        "responder": "70002",
        "description": {
            "tried": "2020-09-10T17:50:26.058Z"
        }
    }
}
```

_Note_: For that specific message, the issuer is the server, not the remote peer.

### session-info - ringing

When the remote peer receives a call, he starts by answering an acknowledgment to the issuer. For doing that, he sends a message of type **session-info** with a `reason=ringing` in order to inform the issuer that the call is ringing and so correctly arrived to the remote peer.

```json
{
    "id": "fdc216f8-3d73-4865-a3c7-b43e1f5338a3",
    "from": "70002",
    "to": "70001",
    "jsongle": {
        "sid": "678403f4-7b1f-4ea5-84cb-c6699a91db22",
        "action": "session-info",
        "reason": "ringing",
        "initiator": "70001",
        "responder": "70002",
        "description": { "rang": "2020-09-10T17:50:26.061Z" }
    }
}
```

### session-retract

The **session-retract** message is sent when the issuer want to cancel the call in progress. This message is only sent if the call is not active. Elsewhere a **session-terminate** message is sent.

```json
{
    "id": "23cf5699-b746-4e21-8698-01e499b946b7",
    "from": "70001",
    "to": "70002",
    "jsongle": {
        "sid": "678403f4-7b1f-4ea5-84cb-c6699a91db22",
        "action": "session-retract",
        "reason": "",
        "initiator": "70001",
        "responder": "70002",
        "description": { "ended": "2020-09-10T17:50:38.071Z" }
    }
}
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
