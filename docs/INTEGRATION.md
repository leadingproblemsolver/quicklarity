# Integration

## Inputs

A workspace accepts project, observable outcome, audience, start date, constraints, and up to 20 tasks. Each task includes 1–5 operator judgments for impact, urgency, confidence, effort, and risk plus an optional blocker.

The score is a prioritization aid, not measured business value.

## Portable workspace contract

```json
{
  "version": 1,
  "intake": {
    "project": "Validation sprint",
    "outcome": "Deliver one verified artifact",
    "audience": "Technical founder",
    "startDate": "2026-08-10",
    "constraints": "Public sources only",
    "tasks": []
  },
  "plan": null
}
```

## Outputs

- Markdown execution plan;
- JSON plan contract (`version: 1`);
- three one-hour calendar events in ICS format beginning on the selected start date;
- complete workspace JSON for backup, handoff, and later iteration.

The app can be served as static assets or `src/lib/planner.js` can be imported by another standards-compliant JavaScript application.
