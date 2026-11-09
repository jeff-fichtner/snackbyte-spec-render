# Feature Specification: Shared Shopping Lists

**Feature Branch**: `003-shared-lists`
**Created**: 2026-09-14
**Status**: In progress
**Input**: "Let two or more people keep one shopping list together, see each other's
changes as they happen, and check items off in the store without stepping on each other."

## User Scenarios & Testing

### User Story 1 - Share a list with someone (Priority: P1)

A household member creates a list and invites a partner by link. The partner opens the
link, joins, and from then on both see the same items.

**Why this priority**: Without sharing there is no feature; every other story builds on a
list with more than one member.

**Independent Test**: Create a list as one user, open its invite link as a second user,
and confirm both see the same three items.

**Acceptance Scenarios**:

1. **Given** a list with three items, **When** the owner creates an invite link and a
   second user opens it, **Then** the second user joins and sees the same three items.
2. **Given** an invite link that was revoked, **When** someone opens it, **Then** they see
   that the invite is no longer valid and join nothing.

---

### User Story 2 - See changes as they happen (Priority: P1)

While one member is in the store, the other adds "oat milk" at home. It appears on the
shopper's phone within a couple of seconds, without a refresh.

**Why this priority**: A shared list that is stale in the store is worse than two
separate lists.

**Independent Test**: With two sessions open on one list, add an item in one and time
its appearance in the other.

**Acceptance Scenarios**:

1. **Given** two members viewing one list, **When** one adds an item, **Then** the other
   sees it within 2 seconds.
2. **Given** a member whose phone lost signal, **When** the signal returns, **Then** the
   changes made meanwhile appear and theirs are sent.

---

### User Story 3 - Check items off without conflicts (Priority: P2)

Two shoppers split up in the store. Each checks items off; neither undoes the other's
work, even when both tap the same item.

**Why this priority**: Conflicts are rare but costly — a re-bought item or a missed one.

**Independent Test**: Check the same item off in two offline sessions, reconnect both,
and confirm the item is checked once and both sessions agree.

**Acceptance Scenarios**:

1. **Given** two members offline, **When** both check off "bread" and reconnect, **Then**
   "bread" is checked and shows who checked it first.

---

### User Story 4 - Group items by aisle (Priority: P3)

Items are grouped by the store section they belong in, so a shopper walks the store once.

**Why this priority**: A convenience; the list works without it.

**Independent Test**: Add "apples", "milk" and "rice"; confirm they land under Produce,
Dairy and Pantry.

---

### Edge Cases

- **A member leaves.** Their past check-offs stay, attributed to "a former member".
- **The owner deletes the list.** Every member sees it disappear on their next sync.
- **An item is renamed while another member checks it off.** Both changes keep.
- **A list reaches 500 items.** Adding more is refused with a clear message.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST let a list's owner create and revoke invite links.
- **FR-002**: The system MUST add a person who opens a valid invite link to the list.
- **FR-003**: The system MUST deliver a change to every online member within 2 seconds.
- **FR-004**: The system MUST queue changes made offline and send them on reconnect.
- **FR-005**: The system MUST resolve concurrent check-offs of one item to a single
  checked state, keeping the earliest.
- **FR-006**: The system MUST NOT let a non-member read a list's items.
- **FR-007**: The system SHOULD group items by store section.
- **FR-008**: The system MAY suggest a section for an item it has not seen before.

### Key Entities

- **List**: a named collection of items with one owner and any number of members.
- **Item**: a name, a quantity, a section, and a checked state with who checked it.
- **Invite**: a revocable link that adds its opener to one list.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95% of changes reach other online members within 2 seconds.
- **SC-002**: No item is checked twice or lost after concurrent offline edits, across
  1,000 simulated conflicts.
- **SC-003**: A new member joins from an invite link in under 10 seconds.
- **SC-004**: 80% of items are placed in the right section without a manual move.
