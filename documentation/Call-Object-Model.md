# Call Object Model

## Properties

The `Call` object has the following properties

```js
{
    id, // the identifier of the call
    state,  // the current state
    caller, // the identifier of the caller
    callee, // the identifier of the callee
    media, // the media used (audio or video)
    active, // true if the call is active
    muted, // true if the call is muted locally,
    remoteIsMuted, // true if the call is muted at the remote side
    inProgress, // true if the call is in progress (not yet active)
    ended,  // true if the call has ended
    outgoing,   // true if the call is an outgoing call
}
```

## States

A `Call` can have the following states:

| **State**   | **Description**                                                                                                      | **Reason**                                                       |
| :---------- | :------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `new`       | Call has just been created                                                                                           |                                                                  |
| `trying`    | Call has been received by the server and is being routed to the remote recipient.<br>Only for the issuer of the call |                                                                  |
| `ringing`   | Call has been received by the remote peer and is being presented<br>Only for the issuer                              |                                                                  |
| `proceeded` | Call has been accepted by the responder                                                                              |                                                                  |
| `offering`  | Call has been accepted by the remote peer and is being negotiated                                                    | `have-offer`<br>`have-answer`<br>`have-both`                     |
| `active`    | Call is active                                                                                                       | `is-active-local`<br>`is-active-remote`<br>`is-active-both-side` |
| `releasing` | Call is releasing by a peer                                                                                          |                                                                  |
| `ended`     | Call is ended                                                                                                        | `retracted`<br>`declined`<br>`terminated`<br>`unreachable`       |

## Lifecycle

### From the caller point of view

On the caller side, the `Call` has the following cycle:

`new` -> `trying` -> `ringing` -> `proceeded` -> `offering` -> `active` -> `releasing` -> `ended`

_Note_: From any state, the `Call` state can move to `ended`.

### From the callee point of view

On the callee side, the `Call` has the following cycle:

`ringing` -> `proceeded` -> `offering` -> `active` -> `releasing` -> `ended`

_Note_: From any state, the `Call` state can move to `ended`.

