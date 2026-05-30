# Exceptions (AFE and VSE)

**Purpose:** Storage for Architecture Freeze Exception (AFE) and Version-Sprawl Exception (VSE) records.
**Source plans:** Plan 1.4 (AFE), Plan 1.5 §15 (VSE).
**Templates:**
  - `phase-1/templates/architecture-freeze-exception-template.md`
  - `phase-1/templates/version-sprawl-exception-template.md`
**Indexes:**
  - `phase-1/registries/backend-v1-exception.registry.md`
  - `phase-1/registries/backend-v1-record-index.registry.md`

## File naming

```text
AFE-NNN-short-slug.md      (Architecture Freeze Exception — Plan 1.4)
VSE-NNN-short-slug.md      (Version-Sprawl Exception — Plan 1.5 §15)
```

NNN is zero-padded, sequential per type, and never reused.

## Default outcomes

- **AFE:** DEFER. Approval is rare and must directly prevent meaningful production-readiness failure.
- **VSE:** REJECT or DEFER. VSE is the last-resort path after confirming FRP and BSCP do not apply.

## Indexing rule (Plan 1.7 §10.3)

Every record in this folder must be added to **both**:

1. `backend-v1-exception.registry.md` (exception-specific index)
2. `backend-v1-record-index.registry.md` (master record index)

in the same work session as the record creation.

## Distinction from FRP / BSCP / SCR

- **AFE** — only for Plan 1.4 architecture-freeze exceptions (new layer / dormant runtime / constitutional expansion).
- **VSE** — only for Plan 1.5 version-sprawl exceptions where neither FRP nor BSCP applies.
- **FRP** — formal replacement; stored in `formal-replacements/`.
- **BSCP** — bounded shadow comparison; stored in `shadow-comparisons/`.
- **SCR** — scope change requests; stored in `scope-changes/`.

---

*This folder is Level 5 (individual records). Plans 1.4 and 1.5 are authoritative.*
