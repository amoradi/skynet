# Skynet Data Pipeline Architecture

## Overview

A scalable data pipeline for market relationship discovery, ingesting data from multiple sources (EDGAR, FRED, GDELT, ACLED, etc.), unifying them into a common schema, and running statistical hypothesis testing to discover cross-asset signal relationships.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           INGESTION LAYER                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  EDGAR  │ │  FRED   │ │  GDELT  │ │  ACLED  │ │  etc... │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       │           │           │           │           │             │
│       └───────────┴───────────┴───────────┴───────────┘             │
│                               │                                     │
│                     EventBridge (scheduled)                         │
│                               │                                     │
│                        Lambda / ECS Tasks                           │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           RAW LAYER (S3)                            │
│                                                                     │
│   s3://skynet-raw/edgar/2026/02/12/filings.json                    │
│   s3://skynet-raw/fred/2026/02/12/series.json                      │
│   s3://skynet-raw/gdelt/2026/02/12/events.json                     │
│                                                                     │
│   • Immutable, append-only                                          │
│   • Partitioned by source/date                                      │
│   • Schema-on-read                                                  │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                                │ S3 Event → SQS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        TRANSFORM LAYER                              │
│                                                                     │
│   Lambda / Step Functions                                           │
│   • Normalize to unified schema                                     │
│   • Dedupe, validate, enrich                                        │
│   • Idempotent (rerunnable)                                         │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     UNIFIED LAYER (PostgreSQL + TimescaleDB)        │
│                                                                     │
│   events                                                            │
│   ├── id (uuid)                                                     │
│   ├── timestamp (timestamptz)      ← TimescaleDB hypertable        │
│   ├── source (enum: edgar, fred, gdelt, ...)                       │
│   ├── event_type (text)            ← "insider_buy", "cpi_release"  │
│   ├── entity (text)                ← ticker, country, indicator    │
│   ├── value (numeric)              ← normalized value if applicable│
│   ├── metadata (jsonb)             ← source-specific fields        │
│   └── ingested_at (timestamptz)                                     │
│                                                                     │
│   market_data                                                       │
│   ├── timestamp, asset, price, volume, ...                         │
│                                                                     │
│   • Indexes on (source, event_type, timestamp)                      │
│   • TimescaleDB for time-series compression + fast range queries    │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ANALYSIS LAYER                               │
│                                                                     │
│   Python workers (ECS or Lambda)                                    │
│   ├── Hypothesis runner                                             │
│   │   • Pull event windows + market data                            │
│   │   • Run statistical tests (scipy)                               │
│   │   • Permutation testing, Bonferroni correction                  │
│   │                                                                 │
│   ├── Results → relationships table                                 │
│   │   • hypothesis_id, p_value, hit_rate, edge, validated_at       │
│   │                                                                 │
│   └── Triggered by: schedule (daily) or on-demand                   │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVING LAYER                               │
│                                                                     │
│   NestJS API                                                        │
│   ├── /relationships      ← validated discoveries                   │
│   ├── /events             ← unified event stream                    │
│   ├── /hypotheses         ← test results                            │
│   └── /alerts             ← real-time signals                       │
│                                                                     │
│   Redis                                                             │
│   ├── Rate limiting                                                 │
│   ├── Hot cache (recent events, active alerts)                      │
│   └── Pub/sub for real-time                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Sources

| Source | Data Type | Frequency |
|--------|-----------|-----------|
| EDGAR | SEC filings, insider trades | Every 15 min |
| FRED | Federal Reserve economic data | Daily |
| GDELT | Global events, news | Every 15 min |
| ACLED | Conflict data | Weekly |
| OpenSky | Flight tracking | Real-time |
| NASA EONET/FIRMS | Natural events, fires | Daily |
| USGS | Earthquakes, geological | Real-time |
| EIA | Energy data | Weekly |
| Polymarket | Prediction markets | Real-time |
| Cloudflare Radar | Internet traffic patterns | Hourly |

---

## Scheduling

| Source | Frequency | Method |
|--------|-----------|--------|
| FRED | Daily | EventBridge → Lambda |
| EDGAR | Every 15 min | EventBridge → Lambda |
| GDELT | Every 15 min | EventBridge → Lambda |
| ACLED | Weekly | EventBridge → Lambda |
| Market data | Real-time | WebSocket → Redis → Postgres |
| Hypothesis tests | Daily (overnight) | Step Functions batch job |

---

## Key Design Decisions

### 1. Raw → Unified separation
- Never lose original data
- Can reprocess if schema evolves
- Audit trail

### 2. TimescaleDB over plain Postgres
- Native time-series compression (10x storage reduction)
- Fast range queries for backtesting
- Still PostgreSQL (TypeORM compatible)

### 3. Event-driven transforms
- S3 put → SQS → Lambda
- Decoupled, scalable, retryable

### 4. Unified schema with JSONB metadata
- Common fields for joins/queries
- Source-specific fields in metadata
- Flexible without schema explosion

### 5. Analysis as separate workers
- CPU-intensive stats in Python (scipy, pandas)
- Doesn't block API
- Can scale independently

---

## Unified Event Schema

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp       TIMESTAMPTZ NOT NULL,
    source          TEXT NOT NULL,          -- 'edgar', 'fred', 'gdelt', etc.
    event_type      TEXT NOT NULL,          -- 'insider_buy', 'cpi_release', etc.
    entity          TEXT,                   -- ticker, country, indicator
    value           NUMERIC,                -- normalized value if applicable
    metadata        JSONB,                  -- source-specific fields
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

-- TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('events', 'timestamp');

-- Indexes
CREATE INDEX idx_events_source_type ON events (source, event_type, timestamp DESC);
CREATE INDEX idx_events_entity ON events (entity, timestamp DESC);
```

---

## Scaling Path

| Stage | Data Volume | Approach |
|-------|-------------|----------|
| Now | GBs | Single Postgres, Lambda |
| 10x | 100s GB | TimescaleDB compression, read replicas |
| 100x | TBs | S3 + Athena for cold queries, Postgres for hot |
| 1000x | PBs | Snowflake/Redshift, Spark for analysis |

---

## Stack Summary

| Component | Technology |
|-----------|------------|
| Ingestion | EventBridge + Lambda (or ECS for long-running) |
| Raw Storage | S3 (partitioned by source/date) |
| Queue | SQS (transform triggers) |
| Transform | Lambda or Step Functions |
| Database | PostgreSQL + TimescaleDB |
| Cache | Redis |
| Analysis | Python (scipy, pandas) on ECS |
| API | NestJS + TypeORM |
| Infra | AWS CDK or Terraform |
