# Pokémon Lab — Friend Battle Firestore setup

Friend Battle uses Firebase Authentication and a Firestore collection named `battleRooms`. Both trainers must be signed in with separate accounts. Run the site over `http://localhost` or HTTPS, not `file://`.

## 1. Merge these rules into your existing Firestore rules

Open Firebase Console → Firestore Database → Rules. Keep your existing rules for `users/{userId}` and every other collection. Add this `match` block inside the existing `match /databases/{database}/documents { ... }` block. Do not add a second `service cloud.firestore` block.

```javascript
match /battleRooms/{roomId} {
  function signedIn() {
    return request.auth != null;
  }

  function isRoomMember() {
    return signedIn() &&
      (resource.data.hostUid == request.auth.uid ||
       resource.data.guestUid == request.auth.uid);
  }

  // Friend Battle checks candidate codes before reserving one.
  // Permit direct GET of a missing candidate, members' rooms, and waiting rooms.
  // Do not permit collection queries/listing.
  allow get: if signedIn() && (
    !exists(/databases/$(database)/documents/battleRooms/$(roomId)) ||
    isRoomMember() ||
    (resource.data.guestUid == null && resource.data.status == 'waiting')
  );
  allow list: if false;

  allow create: if signedIn()
    && request.resource.data.hostUid == request.auth.uid
    && request.resource.data.guestUid == null
    && request.resource.data.status == 'waiting';

  // A waiting room can be joined by one different signed-in trainer.
  allow update: if isRoomMember() || (
    signedIn()
    && resource.data.hostUid != request.auth.uid
    && resource.data.guestUid == null
    && resource.data.status == 'waiting'
    && request.resource.data.hostUid == resource.data.hostUid
    && request.resource.data.guestUid == request.auth.uid
    && request.resource.data.status == 'lobby'
  );

  allow delete: if signedIn()
    && resource.data.hostUid == request.auth.uid;
}
```

Keep the rules for your other collections. Review the final combined rules before publishing. These rules are for a casual prototype: current room members can update room data broadly, so a determined player could manipulate battle state. For ranked/competitive play, validate turns and damage in a trusted backend/Cloud Function.

## 2. Test Friend Battle

1. Publish the merged rules.
2. Open Pokémon Lab on two browsers/devices and sign in using two different trainer accounts.
3. On device A, open Battle → Friend Battle → **Create Room**.
4. Share the six-character room code with device B.
5. On device B, enter the code and choose **Join Room**.
6. Both trainers select a Pokémon. The battle begins when both selections are saved; the host takes the first turn.

## 3. Troubleshooting

- `permission-denied` during room creation: confirm the `allow get` rule allows signed-in users to check a missing room document, and that `allow create` matches the room's `hostUid`, `guestUid`, and `status` fields.
- `permission-denied` when joining: verify the join update changes `guestUid` to the joining user's UID and `status` to `lobby`.
- No live updates: ensure both users are signed in to the same Firebase project and Firestore Database, and check the browser Console.
- Do not paste this snippet as a standalone ruleset. Merge it into your existing rules and publish once.
