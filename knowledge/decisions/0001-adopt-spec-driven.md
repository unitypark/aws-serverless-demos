# 0001 — Adopt spec-driven delivery

- **Status:** accepted
- **Date:** 2026-08-11
- **Project:** aws-serverless-demos

## Context

AI coding agents produce inconsistent results when every session rediscovers the
codebase from raw source. Context evaporates when a session ends, conventions get
reinvented, and assumptions ship silently.

## Decision

Work reaches coding agents as a **human-approved spec**, never as a bare prompt.
Agents read [knowledge/README.md](../README.md) first, cite what they relied on,
and file the as-built spec back into [knowledge/specs/](../specs/README.md) in
the same PR as the code.

The approval gate is structural: no agent may approve its own input.

## Consequences

- Every change is traceable to an approved spec and a named approver.
- `knowledge/` must be maintained in the same PR as the code it describes,
  or it rots and the next spec is grounded in fiction.
- Prompt injection via ticket text cannot reach a code-writing agent without
  surviving human review first.
