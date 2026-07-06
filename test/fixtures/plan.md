# Widget Implementation Plan

**Branch**: `007-widget` | **Date**: 2026-07-06 | **Spec**: spec.md

## Summary

A short plan to build the widget.

## Technical Context

**Language**: JavaScript (ESM)
**Runtime**: Node >=24
**Dependencies**: markdown-it, highlight.js
**Testing**: vitest

## Constitution Check

| Principle            | Compliance                    |
| -------------------- | ----------------------------- |
| Correct from day one | ✅ PASS — exports + files set |
| Publish contract     | ✅ PASS                       |
| No secrets           | ✅ PASS                       |

## Project Structure

```
src/
  index.mjs   NEW
  cli.mjs     NEW
```

## Complexity Tracking

None.
