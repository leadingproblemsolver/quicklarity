# Quickarity

Quickarity is a local-first decision and three-day execution planner for founders and operators facing too many competing tasks.

It ranks only work the operator supplies, separates blocked and deferred work, assigns the six highest-ranked executable tasks across three dated days, and exports Markdown, JSON, ICS, or a complete portable workspace. It does **not** invent strategic evidence or require an AI provider.

## Run

```bash
npm ci
npm run dev
```

Production verification:

```bash
npm run validate
npm run preview
```

The prebuilt `dist/` folder is directly deployable to a static host.

## Immediate user workflow

```text
project + observable outcome + target user + start date + constraints + tasks
→ bounded deterministic scoring
→ three-day dated plan
→ blocked/deferred list
→ Markdown / JSON / ICS export
```

Use **Export workspace** to preserve inputs and the current plan in `.quickarity.json`; another browser can import it without an account or database.

## Integration surfaces

- reusable JavaScript planner module: `src/lib/planner.js`;
- portable workspace JSON;
- plan JSON for downstream automation;
- Markdown for repositories and planning documents;
- ICS for calendar import.

See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) and [`DEPLOYABILITY_DISTRIBUTION.md`](DEPLOYABILITY_DISTRIBUTION.md).
