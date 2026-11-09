# Implementation Plan: Shared Shopping Lists

**Branch**: `003-shared-lists` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

## Summary

Members of a list share one copy of its items. Each change is an operation sent over a
WebSocket and stored in order; the server applies it and fans it out to every connected
member. Offline changes queue on the device and replay on reconnect. Check-offs are
last-writer-loses: the first check of an item wins, so concurrent check-offs settle to
one state without a merge step.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node 24
**Primary Dependencies**: Fastify 5, `ws`, Drizzle ORM
**Storage**: PostgreSQL 16 (lists, items, an append-only operation log)
**Testing**: Vitest; a throwaway Postgres per test run
**Target Platform**: Linux container; mobile web clients
**Project Type**: web service + web client
**Performance Goals**: change delivered to online members in < 2 s at p95
**Constraints**: works offline in the store; no item lost on reconnect
**Scale/Scope**: lists of up to 500 items, up to 10 members each

## Constitution Check

| Principle                      | Compliance                                                   |
| ------------------------------ | ------------------------------------------------------------ |
| I. Data belongs to its members | ✅ PASS — every read is filtered by membership (FR-006)      |
| II. Works offline              | ✅ PASS — operations queue on the device and replay (FR-004) |
| III. Test against real things  | ✅ PASS — a real Postgres per run, no mocked database        |
| IV. Fail loud                  | ✅ PASS — missing config stops the server at start           |
| V. Simple first                | ⚠️ WATCH — section suggestions deferred to a later feature   |

## Project Structure

```text
src/
├── lists/
│   ├── routes.ts        NEW  create, rename, delete, invite
│   ├── membership.ts    NEW  join, leave, revoke
│   └── sections.ts      NEW  item → store section
├── sync/
│   ├── socket.ts        NEW  WebSocket per member
│   ├── operations.ts    NEW  apply + order operations
│   └── fanout.ts        NEW  deliver to connected members
└── db/
    └── migrations/
        └── 0003_shared_lists.sql   NEW
client/
└── sync/
    └── queue.ts         NEW  offline operation queue
```

## Complexity Tracking

| Choice                    | Why                                      | Simpler option rejected because      |
| ------------------------- | ---------------------------------------- | ------------------------------------ |
| Append-only operation log | Replays offline changes in a fixed order | Last-write-wins on rows loses edits  |
