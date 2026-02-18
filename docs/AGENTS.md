# AI Agents Architecture

Autonomous market relationship discovery across disparate data sources.

---

## Core Concept

**Goal**: Discover hidden relationships between events across different domains (geopolitical, economic, corporate, markets) that have predictive value.

**Data Sources**:
- EDGAR (SEC filings, insider trades)
- FRED (economic indicators)
- GDELT (global news, geopolitical events)
- ACLED (conflict data)
- Polymarket (prediction markets)
- EIA (energy data)

**Key Insight**: Markets move on information. Information is scattered across domains. An AI that can connect dots across domains finds edges humans miss.

---

## Agent Architecture

### 1. Discovery Agent

**Purpose**: Autonomous investigation of potential market relationships.

**Input**: A thesis or question
```
"Do geopolitical conflicts in oil-producing regions predict energy price movements?"
"Is there a relationship between Fed governor speeches and treasury yields?"
"Do prediction market movements lead equity moves?"
```

**Behavior**:
1. **Plan investigation** - Break thesis into testable components
2. **Gather data** - Query relevant sources (GDELT for conflicts, EIA for oil prices, etc.)
3. **Analyze** - Run statistical tests, check correlations, look for lead/lag
4. **Reason about causality** - Why might this relationship exist? What's the mechanism?
5. **Report** - Generate findings with confidence levels and caveats

**Tools**:
```typescript
const DiscoveryAgentTools = {
  // Data gathering
  query_events: "Search events by source, type, entity, date range",
  query_market_data: "Get price/volume data for assets",
  query_economic_data: "Get FRED economic indicators",
  query_geopolitical: "Search GDELT/ACLED for geopolitical events",

  // Analysis
  compute_correlation: "Calculate correlation between two time series",
  test_granger_causality: "Test if X Granger-causes Y",
  run_event_study: "Measure market reaction around events",
  detect_lead_lag: "Find optimal lag between two series",

  // Reasoning
  search_similar_patterns: "Find historical precedents",
  identify_confounders: "List potential confounding variables",

  // Output
  create_hypothesis: "Save hypothesis for further testing",
  create_report: "Generate investigation report",
};
```

**Example Investigation**:
```
Thesis: "OPEC announcements predict oil price movements"

Agent Plan:
1. Query GDELT for OPEC-related news (last 2 years)
2. Get WTI crude prices from market data
3. Align events with price movements
4. Run event study: price change in [-1, +5] day window
5. Test statistical significance
6. Check for confounders (general market conditions, inventory data)
7. Reason about mechanism (supply expectations, market positioning)
8. Generate report with findings

Findings:
- OPEC production cut announcements → +2.3% avg WTI move (p=0.008)
- Effect stronger when announcement is unexpected (market pricing < 50%)
- Confounded by: USD strength, global demand proxies
- Mechanism: Supply reduction → price increase (basic economics)
- Confidence: HIGH for direct announcements, MEDIUM for indirect signals
```

---

### 2. Causal Reasoning Agent

**Purpose**: Go beyond correlation to understand WHY relationships exist.

**Input**: A discovered correlation
```
{
  event_type: "fed_governor_speech",
  market_asset: "TLT",
  correlation: 0.34,
  p_value: 0.02
}
```

**Behavior**:
1. **Hypothesize mechanisms** - Generate possible causal pathways
2. **Test mechanisms** - Look for evidence supporting/refuting each
3. **Identify confounders** - What else could explain this?
4. **Check robustness** - Does relationship hold across time periods, conditions?
5. **Assign causal confidence** - Correlation, likely causal, definitely causal

**Causal Analysis Framework**:
```
Correlation found: X → Y

Questions to answer:
1. Temporal precedence: Does X consistently precede Y?
2. Mechanism: Is there a plausible causal pathway?
3. Confounders: Could Z cause both X and Y?
4. Intervention: When X is "shocked", does Y respond?
5. Consistency: Does relationship hold across different contexts?
6. Dose-response: Does more X lead to more Y?
```

**Example**:
```
Correlation: Insider buying clusters → Stock outperformance

Causal Analysis:
1. Temporal: Yes, buying precedes outperformance by 30-90 days
2. Mechanism: Insiders have information about future performance
3. Confounders:
   - Value stocks (cheap = more insider buying AND more upside)
   - Sector effects
   - Market conditions (more buying in downturns)
4. After controlling for confounders: Relationship persists but weaker
5. Causal confidence: LIKELY CAUSAL (information advantage hypothesis)
```

---

### 3. Synthesis Agent

**Purpose**: Combine discoveries into actionable intelligence.

**Input**: Multiple relationships, current market state

**Behavior**:
1. **Monitor active signals** - Which discovered relationships are triggering now?
2. **Assess confluence** - Are multiple signals pointing the same direction?
3. **Generate alerts** - Surface actionable opportunities
4. **Maintain context** - Update understanding as new data arrives

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                            │
│  EDGAR │ FRED │ GDELT │ ACLED │ Polymarket │ EIA │ Market Data │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED EVENT STORE                        │
│              PostgreSQL + TimescaleDB + pgvector                │
│                                                                 │
│  events: timestamp, source, type, entity, value, embedding      │
│  market_data: timestamp, asset, OHLCV                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐
│ DISCOVERY AGENT │ │ CAUSAL AGENT  │ │ SYNTHESIS AGENT │
│                 │ │               │ │                 │
│ Investigate     │ │ Why does this │ │ What's          │
│ hypotheses      │ │ relationship  │ │ actionable      │
│ across sources  │ │ exist?        │ │ right now?      │
└────────┬────────┘ └───────┬───────┘ └────────┬────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       RELATIONSHIPS                             │
│                                                                 │
│  Discovered patterns with:                                      │
│  - Statistical evidence (p-value, hit rate, edge)              │
│  - Causal reasoning (mechanism, confidence)                    │
│  - Actionability (current signals, confluence)                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ALERTS                                 │
│                                                                 │
│  "Conflict escalation in Region X + OPEC meeting tomorrow      │
│   → Historical pattern suggests oil volatility (78% hit rate)  │
│   → Mechanism: Supply uncertainty + geopolitical risk premium" │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Approach

### Phase 1: Foundation
- Unified event store with all data sources
- Basic querying and correlation tools
- Simple hypothesis testing (Python worker)

### Phase 2: Discovery Agent
- LLM-powered investigation planning
- Tool calling for data gathering
- Automated hypothesis generation and testing

### Phase 3: Causal Reasoning
- Mechanism hypothesis generation
- Confounder identification
- Robustness testing

### Phase 4: Synthesis
- Real-time signal monitoring
- Multi-signal confluence detection
- Actionable alert generation

---

## Example Discoveries

**Cross-domain relationships the system might find:**

1. **GDELT → Commodities**
   - Middle East conflict coverage spikes → Oil volatility within 48h
   - Mechanism: Supply disruption risk premium

2. **EDGAR → Equities**
   - Clustered insider buying → Sector outperformance 60-90 days
   - Mechanism: Information advantage

3. **FRED → Rates**
   - Unexpected CPI prints → Treasury yield moves
   - Mechanism: Fed policy expectations

4. **Polymarket → Equities**
   - Election odds shifts → Sector rotation
   - Mechanism: Policy uncertainty pricing

5. **ACLED → Emerging Markets**
   - Conflict escalation → EM currency weakness
   - Mechanism: Risk-off flows, capital flight

6. **Cross-source**
   - Fed speech sentiment (GDELT) + Insider activity (EDGAR) → Equity direction
   - Mechanism: Institutional positioning ahead of policy shifts
