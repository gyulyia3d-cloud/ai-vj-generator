# Project versions and migration (Phase 19)

An old project must keep opening. Two numbers describe a project:
- `schema` (`ai-vj-generator/2`): the family of the format. `/1` is still accepted.
- `meta.formatVersion` (integer): the version of the FORMAT, written by the generator, the engine and `migrate_project.py`. Absent means 0, a project from before this pipeline.

`registry/versions.json` holds `format.current` and `steps`: declarative migrations, in order, each one `to` a format version. The browser engine (`app/migrate.js`) and Python (`scripts/migrate_project.py`) apply the same steps and give the same result and the same report (`scripts/migrate_check.mjs`).

## What runs when
- **The engine** migrates on every import (`normalize`): old project in, current format out, a warning line per step that changed something ("migrado (capabilities-legacy-labels): ...").
- **Python:** `python scripts/migrate_project.py project.json` prints what would change; `--out new.json` or `--in-place` writes. `validate_project.py` notes a project that is behind and warns about one that is ahead.
- The migration runs on a COPY: the input object is never changed. Each step is idempotent; migrating a migrated project changes nothing.

## Rules
1. An **additive** change (a new field with a default, a new layer type, a new IR block) needs no step: old projects simply lack the field and the default fills it.
2. A change that **renames, moves or removes** a field needs a step in `versions.json`, a new `format.current`, and a line in `CHANGELOG.md`. Ops available: `renameCapability`, `remapArchetype`. A new kind of change adds an op to both `migrate.js` and `migrate_project.py`; `registry.mjs --check` fails if the steps are not contiguous from 1 to `format.current`.
3. The version decides, not the content: a project already stamped with the current format is not migrated, even if it still carries an old field (it then gets the validator's deprecation warning).
4. A project from a **newer** format than the tool knows is not refused and not rewritten: it opens with a warning, unknown fields are ignored and never deleted, and `meta.formatVersion` keeps its value.
5. Examples and the gallery must migrate to themselves plus the stamp (`migrate_check.mjs` checks every file).

## Current steps
| to | id | since | what it does |
|---|---|---|---|
| 1 | `capabilities-legacy-labels` | 3.1.0 | `capabilities.requiresBridge` and `capabilities.conceptual` become `capabilities.notSupported`, without repeats |
| 2 | `archetype-out-of-scope` | 3.1.0 | `meta.spec.archetype`: `object-mapping` becomes `installation`; `immersive` and `dooh` left the product and are removed |

The older `deprecated` list in `versions.json` is the human-readable record of the same changes.
