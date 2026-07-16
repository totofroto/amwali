# المزامنة | Sync — how it works now

## Cloud layout (Firebase Realtime Database)

```
/amwali/{familyCode}/
    meta                → settings blob  { appName, users, adminId, theme,
                                           currencies, cats, pin, sound, notify, _u }
                          (users[] entries now carry per-person `pin` and `private`)
    tx/{id}             → one node per transaction, each carries _u
    transfers/{id}
    debts/{id}
    budgets/{id}
    recurring/{id}
    goals/{id}
    audit/{id}          → deletion log: {id, ts, action, coll, summary, reason, by, _u}

/amwali/{familyCode}-backups/{timestamp}   → daily full snapshot, newest 30 kept
```

Every record carries `_u` — the epoch-ms timestamp stamped when it was last pushed.
A deleted record leaves a **tombstone** `{id, _d:true, _u}` so that a peer that was
offline when the delete happened does not resurrect it on its next pull. Tombstones
are dropped after 90 days.

## The cycle

`syncCycle()` = **push, then pull.** Always in that order.

- **Push** compares the live state against a local *shadow* (the last snapshot both
  this device and the cloud agreed on) and `PATCH`es **only the records that changed**
  to `/amwali/{code}/{collection}.json`. Firebase merges children, so two people
  pushing different transactions no longer overwrite each other.
- **Pull** `GET`s the whole node and merges record by record: a cloud record wins only
  if its `_u` is strictly newer than the local copy's.
- Pushing first is what makes a pending local edit win over the older cloud copy,
  instead of being clobbered by it.

Triggers: on load, every 20 s, on `window.focus`, on `online`, and a `keepalive`
flush on `pagehide` / tab-hide.

## What replaced what

| Before | Now |
|---|---|
| `PUT` of the entire state — last writer wipes everyone else | `PATCH` of changed records only — merges |
| `sync.code` defaulted to `''` → `syncOn()` false → **silent** no-sync | Blocking in-app modal at first run + red banner whenever sync is off |
| Native `prompt()` at boot (suppressed on mobile) | `#syncModal` — a real DOM modal |
| Settings showed a fake `main` in the code box | Settings shows the actual stored code |
| Deleting a record could be undone by a stale peer | Tombstones |

## Security

The database is currently open to anyone who knows the family code. `firebase-rules.json`
in this repo at least forces the code to be **16+ characters**, which makes guessing
impractical. Paste it into Firebase Console → Realtime Database → Rules → Publish.

> Pick a long code, e.g. `shek-family-2026-9k3xq`. Use the **exact same string** on
> every device. This is the real password to your family's finances — treat it like one.

The proper fix is Firebase Anonymous Auth with `".write": "auth != null"`, which needs
the Firebase JS SDK. Worth doing if this ever holds anything sensitive.
