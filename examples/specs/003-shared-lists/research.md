# Research: Shared Shopping Lists

## R1. How changes travel

**Decision**: A WebSocket per member per device; the server fans out each applied
operation.

**Rationale**: Delivery within 2 seconds (FR-003) needs a push channel. Polling every
second costs more and still misses the target under load.

**Alternatives considered**: Server-sent events (one-way; writes would need a second
channel); polling (latency and cost).

## R2. Settling concurrent check-offs

**Decision**: The earliest check-off of an item wins; later ones are recorded but change
nothing.

**Rationale**: A check-off is a fact about the store trip, not an edit to merge. Keeping
the first gives one answer with no merge step (FR-005).

**Alternatives considered**: CRDT sets (correct, but heavy for a single boolean);
last-write-wins (lets a late uncheck undo a real purchase).

## R3. Offline queue storage

**Decision**: IndexedDB on the device, one ordered store per list.

**Rationale**: Survives the browser closing mid-trip; holds far more than 500 items.
