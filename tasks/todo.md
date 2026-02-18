# Todo

## Current Sprint: Backend Infrastructure

### In Progress
- [ ] Set up TypeORM entities for unified schema

### Up Next
- [ ] Configure PostgreSQL + TimescaleDB connection
- [ ] Create API modules
  - [ ] Events module (`/events`)
  - [ ] Relationships module (`/relationships`)
  - [ ] Alerts module (`/alerts`)
  - [ ] Hypotheses module (`/hypotheses`)
- [ ] Create ingestion services
  - [ ] EDGAR fetcher (SEC filings)
  - [ ] FRED fetcher (economic data)
  - [ ] GDELT fetcher (geopolitical events)
  - [ ] Polymarket fetcher (prediction markets)
- [ ] Set up Redis caching + pub/sub
- [ ] Create Python analysis worker
  - [ ] Hypothesis runner
  - [ ] Statistical tests (scipy)
  - [ ] Bonferroni correction

### Backlog
- [ ] AWS Lambda deployment (ingestion)
- [ ] S3 raw data storage
- [ ] EventBridge scheduling
- [ ] WebSocket real-time alerts

---

## Completed
- [x] Initialize NestJS project
- [x] Install TypeORM + PostgreSQL dependencies
- [x] Create SKILLS.md
- [x] Create ARCHITECTURE.md
- [x] Create tasks directory
