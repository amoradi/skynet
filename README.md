# Market Relationship Discovery

Backend intelligence layer for discovering cross-asset signal relationships.

Ingests data from multiple sources (EDGAR, FRED, GDELT, Polymarket), normalizes to unified schema, runs statistical hypothesis testing, and serves discovered relationships via API.

## Architecture

![Architecture Diagram](architecture-diagram.svg)

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Stack

| Layer | Technology |
|-------|------------|
| API | NestJS + TypeORM |
| Database | PostgreSQL + TimescaleDB |
| Cache | Redis |
| Analysis | Python (scipy, pandas) |
| Infra | AWS (Lambda, S3, SQS, EventBridge) |

## Data Sources

| Source | Data Type | Frequency |
|--------|-----------|-----------|
| EDGAR | SEC filings, insider trades | 15 min |
| FRED | Economic indicators | Daily |
| GDELT | Global events, news | 15 min |
| ACLED | Conflict data | Weekly |
| Polymarket | Prediction markets | Real-time |
| EIA | Energy data | Weekly |

## Development

```bash
npm install
npm run start:dev
```

## License

MIT
