# CardioSynth: Living Cardiology Evidence Synthesis Engine — Design Spec

**Date**: 2026-04-08
**Author**: Mahmood Ahmad, Tahir Heart Institute
**Status**: Approved

## Mission

Any cardiologist on earth can query the current best evidence on any cardiology intervention — with full audit trail — in under 10 seconds, for free, from a browser.

Phase 0 target: colchicine post-STEMI. One complete, publishable, fully-provenance-tracked living meta-analysis.

## Architecture Decisions

1. **Browser-native first** — All computation in vanilla JS. No Node.js, Python, or R runtime.
2. **Single HTML files** — Each tool is self-contained .html. No build step, no npm.
3. **CT.gov as sole primary source** — ClinicalTrials.gov API v2 only. No PDF extraction in Phase 0.
4. **TruthCert fail-closed** — Every number passes validation. Pipeline halts on unresolved critical flags.
5. **Provenance chain on every number** — NCT, results path, timestamp, extractor ID, validator verdict, witness count.
6. **Two-agent extraction minimum** — Independent dual extraction. Disagreements flagged to human arbitration.
7. **MetaEngine is the only statistics engine** — DS-L RE, HKSJ, I2, tau2, Baujat, LOO, cumulative.

## Reuse Strategy (Approach A — Port & Inline)

Port validated algorithms from `C:/HTML apps/living-meta/src/lib/` into self-contained `<script>` blocks:

| Source Module | Target File | What to Port |
|---|---|---|
| `ctgov-api.js` | `ct-harvester.html` | Rate limiting, retry, pagination, API client |
| `meta-dl.js` + `meta-fe.js` + `meta-cache.js` | `metaengine.html` | DS-L, HKSJ, FE, Q, I2, tau2 |
| `binary-methods.js` | `metaengine.html` | Peto OR, MH, escalc for RR/RD/OR |
| Statistical utilities (qnorm, pchisq, lgamma, pt) | All files needing stats | Core math functions |

All ported code retains R-validation status. New functions require fresh validation.

## Repository Structure

```
cardiosynth/
├── CLAUDE.md
├── README.md
├── /core
│   ├── metaengine.html          # DS-L RE engine, validated vs R
│   ├── truthcert.html           # Validator suite v3.1
│   ├── provenance-store.html    # Audit log + chain of custody
│   └── disagreement-queue.html  # Human arbitration interface
├── /harvesters
│   ├── ct-harvester.html        # CT.gov API v2 query engine
│   ├── cardio-classifier.html   # MeSH/condition cardiology filter
│   └── results-extractor.html   # Structured results parser
├── /validators
│   ├── arm-swap-detector.html
│   ├── timepoint-drift.html
│   ├── unit-checker.html
│   ├── duplicate-detector.html
│   ├── zero-cell-handler.html
│   └── multiarm-adjuster.html
├── /synthesis
│   ├── cardiosynth-dashboard.html
│   ├── nma-engine.html
│   └── bias-quantifier.html
├── /phase0
│   ├── colchicine-stemi.html
│   └── extraction-log.json
└── /docs
    ├── methodology.md
    ├── validation-report.md
    └── e156-papers/
```

## Phase 0 Build Sequence

Strict sequential order. Each phase gates on previous phase tests passing.

### Phase 0.1 — CT.gov Harvester (`/harvesters/ct-harvester.html`)
- Query CT.gov API v2 with condition/intervention/date filters
- Pagination, caching (localStorage keyed by query hash + timestamp)
- Cardiology MeSH filter (14 terms)
- Validation: must return COLCOT (NCT02551094)
- Port from: `living-meta/src/lib/ctgov-api.js`

### Phase 0.2 — Results Extractor (`/harvesters/results-extractor.html`)
- Parse resultsSection: outcomeMeasures, adverseEvents, participantFlow
- Output: structured ExtractionObject (schema defined)
- Validation: COLCOT primary outcome, N~4745, colchicine vs placebo

### Phase 0.3 — TruthCert Integration (`/core/truthcert.html`)
- 10 validators in strict order, halt on CRITICAL
- ARM_SWAP, TIMEPOINT_DRIFT, UNIT_CHECK, TOTAL_CHECK, EVENT_RATE, ZERO_CELL, DUPLICATE, MULTIARM, OUTCOME_SWITCHING, REGISTRATION_TIMING
- Output: verdict (PASS/WARN/FAIL/CRITICAL), flags, cleared_for_synthesis

### Phase 0.4 — Two-Agent Extraction Pipeline
- Dual extraction with different prompt framings
- Field-by-field comparison (1% numeric tolerance, 0.95 string similarity)
- Disagreement queue UI for human arbitration

### Phase 0.5 — MetaEngine Integration (`/core/metaengine.html`)
- Wire certified ExtractionObjects into pooling
- Auto-select effect measure (RR for binary, MD/SMD for continuous)
- SVG forest plot (inline, no library)
- Port from: `living-meta/src/lib/meta-dl.js`, `binary-methods.js`

### Phase 0.6 — Bias Quantification (`/synthesis/bias-quantifier.html`)
- Non-posting bias estimator (posting rate by sponsor/phase/year)
- Outcome Registration Bias Index (ORBI)
- Funnel plot, Egger's test

### Phase 0.7 — Living Update Engine
- Track last_query_timestamp, check for new results
- Auto-extract → validate → integrate or queue
- Version each synthesis state as JSON snapshots

### Phase 0.8 — Colchicine STEMI Dashboard (`/phase0/colchicine-stemi.html`)
- Master dashboard: evidence map, primary/secondary syntheses
- Cumulative analysis, bias panel, provenance bundle
- Auto-generated E156 abstract
- SHA-256 hash of synthesis state

## Validation Standards

- All statistical functions validated against R metafor to |delta| < 0.0001
- Synthetic datasets + known published results
- Validation logged in `/docs/validation-report.md`

## Code Standards

- No external JS libraries (vanilla SVG for forest plots)
- Only fetch to clinicaltrials.gov/api/v2/
- All state in localStorage
- JSDoc on every function
- Filenames: lowercase-hyphenated
