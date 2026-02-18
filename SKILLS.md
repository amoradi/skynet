# Skills

Development methodology and principles for this project.

---

## Workflow Orchestration

### Plan Mode Default
- Enter plan mode for non-trivial tasks (3+ steps)
- Stop and re-plan if issues arise
- Use for verification checkpoints
- Write detailed specs before implementation

### Subagent Strategy
- Offload research/exploration to subagents for clean context
- One focused task per subagent
- Keep main context lean

### Self-Improvement Loop
- Update `tasks/lessons.md` after corrections
- Iterate to drop mistake rate
- Review lessons at session start

### Verification Before Done
- Prove it works (run it)
- Diff changes before commit
- Run tests
- Ask: "Would a staff engineer approve this?"

### Demand Elegance
- Pause before non-trivial changes
- If solution feels hacky, find elegant way
- Skip for truly simple changes

### Autonomous Bug Fixing
- Fix from logs/tests without user input
- Zero context switch to user
- Debug independently

---

## Task Management

1. **Plan first** in `tasks/todo.md` with clear items
2. **Verify** understanding before starting
3. **Track progress** as you go
4. **Explain changes** in commits
5. **Document results** when done
6. **Capture lessons** in `tasks/lessons.md`

---

## Core Principles

### Simplicity First
- Changes as simple as possible
- Minimal code impact
- No over-engineering

### No Laziness
- Find root causes
- No temporary fixes
- Senior engineer standards

### Minimal Impact
- Touch only what's necessary
- Avoid introducing bugs
- Preserve existing behavior

---

## Stack

| Layer | Technology |
|-------|------------|
| API | NestJS |
| Database | PostgreSQL + TimescaleDB |
| ORM | TypeORM |
| Cache | Redis |
| Queue | Bull (Redis-backed) |
| Infra | AWS (Lambda, S3, SQS, EventBridge) |

---

## Data Sources

| Source | Data Type | Frequency |
|--------|-----------|-----------|
| EDGAR | SEC filings, insider trades | 15 min |
| FRED | Economic indicators | Daily |
| GDELT | Global events, news | 15 min |
| ACLED | Conflict data | Weekly |
| Polymarket | Prediction markets | Real-time |
| EIA | Energy data | Weekly |
