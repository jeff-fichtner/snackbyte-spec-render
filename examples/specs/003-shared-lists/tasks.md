# Tasks: Shared Shopping Lists

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md)

**Tests** are written with each module, against a real Postgres.

## Phase 1: Setup

- [x] T001 Add `ws` and Drizzle ORM to `package.json`
- [x] T002 Write migration `src/db/migrations/0003_shared_lists.sql`: `list`, `item`, `membership`, `invite`, and the append-only `operation` table
- [x] T003 [P] Add a throwaway Postgres to the test setup in `vitest.config.ts`

## Phase 2: Foundational

- [x] T004 [P] Write the membership check in `src/lists/membership.ts`, used by every read and write; `tests/db/membership.test.ts` covers a non-member refused (FR-006)
- [x] T005 [P] Write the operation model in `src/sync/operations.ts`: add, rename, check, uncheck, remove — each carries its list, item, author and a client sequence number
- [x] T006 Write the WebSocket endpoint in `src/sync/socket.ts`: one connection per member per device, authenticated before it subscribes

**Checkpoint**: a member can connect to a list's socket; a non-member is refused.

## Phase 3: User Story 1 — Share a list with someone (Priority: P1) 🎯 MVP

- [x] T007 [US1] Write invite create and revoke in `src/lists/routes.ts` (FR-001)
- [x] T008 [US1] Write join-by-invite in `src/lists/membership.ts`; a revoked invite joins nothing (FR-002)
- [x] T009 [US1] Write `tests/app/invite.test.ts`: create, open as a second user, both see the same items

**Checkpoint**: two people can share one list.

## Phase 4: User Story 2 — See changes as they happen (Priority: P1)

- [x] T010 [US2] Apply an operation and append it to the log in one transaction in `src/sync/operations.ts`
- [x] T011 [US2] Deliver each applied operation to every connected member in `src/sync/fanout.ts` (FR-003)
- [ ] T012 [US2] [P] Write the offline queue in `client/sync/queue.ts`: operations made offline are stored on the device and sent in order on reconnect (FR-004)
- [ ] T013 [US2] Write `tests/app/latency.test.ts`: two sessions, 200 adds, p95 delivery under 2 s (SC-001)

**Checkpoint**: a change made at home shows up in the store within 2 seconds.

## Phase 5: User Story 3 — Check items off without conflicts (Priority: P2)

- [ ] T014 [US3] Resolve concurrent check-offs to the earliest in `src/sync/operations.ts`, recording who checked it (FR-005)
- [ ] T015 [US3] [P] Write `tests/unit/conflicts.test.ts`: 1,000 simulated concurrent offline check-offs settle to one state (SC-002)

## Phase 6: User Story 4 — Group items by aisle (Priority: P3)

- [ ] T016 [US4] Write the item-to-section table in `src/lists/sections.ts` (FR-007)
- [ ] T017 [US4] Group the client's list view by section

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Refuse an item beyond 500 on one list with a clear message
- [ ] T019 [P] Attribute a former member's check-offs to "a former member"
- [ ] T020 Run `quickstart.md` end to end on a fresh database

## Dependencies

- Phase 2 blocks every user story.
- US2 (Phase 4) needs US1's membership to know who to deliver to.
- US3 builds on US2's operation log; US4 is independent of US2 and US3.
