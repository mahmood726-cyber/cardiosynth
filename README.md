# CardioSynth: Living Cardiology Evidence Synthesis Engine

Browser-native, zero-dependency, provenance-tracked living meta-analysis engine for cardiology.
Draws exclusively on ClinicalTrials.gov structured results data.

## Phase 0: Colchicine post-STEMI

One complete, publishable living meta-analysis delivered end-to-end.

## Architecture

- Single HTML files -- open in browser, works immediately
- CT.gov API v2 as sole data source
- TruthCert fail-closed validation on every number
- Two-agent extraction with human arbitration
- DerSimonian-Laird random effects (HKSJ-corrected), validated against R metafor

## Structure

- `/core` -- MetaEngine, TruthCert, provenance store, disagreement queue
- `/harvesters` -- CT.gov harvester, cardiology classifier, results extractor
- `/validators` -- 10 validation modules (arm swap, timepoint drift, etc.)
- `/synthesis` -- Dashboard, NMA engine, bias quantifier
- `/phase0` -- Colchicine-STEMI deliverables

## Tools (14,827 lines, 9 HTML files)

| Tool | Lines | Purpose |
|------|-------|---------|
| `harvesters/ct-harvester.html` | 1,145 | CT.gov API v2 search with cardiology filter |
| `harvesters/results-extractor.html` | 1,312 | Structured results parser |
| `core/truthcert.html` | 1,522 | 10-validator suite (23 documented validation checks) |
| `core/provenance-store.html` | 1,494 | Audit trail + chain of custody (36 documented validation checks) |
| `core/disagreement-queue.html` | 1,501 | Two-agent arbitration UI |
| `core/metaengine.html` | 2,016 | DS-L/HKSJ engine + SVG forest plots (29 documented validation checks) |
| `core/update-engine.html` | 1,480 | Living update + synthesis versioning |
| `synthesis/bias-quantifier.html` | 1,135 | Non-posting bias, ORBI, Egger's (46 documented validation checks) |
| `phase0/colchicine-stemi.html` | 3,222 | Master dashboard (Phase 0 deliverable) |

These counts refer to validation checks summarized in `docs/validation-report.md`. A standalone committed automated test harness is still a separate TODO.

## Status

Phase 0 COMPLETE -- all 8 sub-phases built and validated
