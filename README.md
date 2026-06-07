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

- `/core` -- MetaEngine, TruthCert (10 validators), provenance store, disagreement queue, update engine
- `/harvesters` -- CT.gov harvester, results extractor
- `/synthesis` -- bias quantifier, portfolio aggregator
- `/phase0` -- Colchicine-STEMI deliverable
- `/tests` -- pytest static-artifact contracts
- `/docs` -- methodology, validation report, reference published MAs

The 10 TruthCert validators (arm swap, timepoint drift, etc.) are implemented inside `core/truthcert.html`, not as separate files.

## Tools (18,052 lines, 10 HTML files)

| Tool | Lines | Purpose |
|------|-------|---------|
| `harvesters/ct-harvester.html` | 1,145 | CT.gov API v2 search with cardiology filter |
| `harvesters/results-extractor.html` | 1,312 | Structured results parser |
| `core/truthcert.html` | 1,522 | 10-validator suite (23 documented validation checks) |
| `core/provenance-store.html` | 1,494 | Audit trail + chain of custody (36 documented validation checks) |
| `core/disagreement-queue.html` | 1,501 | Two-agent arbitration UI |
| `core/metaengine.html` | 2,031 | DS-L/HKSJ engine + SVG forest plots (29 documented validation checks) |
| `core/update-engine.html` | 1,480 | Living update + synthesis versioning |
| `synthesis/bias-quantifier.html` | 1,135 | Non-posting bias, ORBI, Egger's (46 documented validation checks) |
| `synthesis/portfolio-aggregator.html` | 219 | Read-only cross-portfolio meta-view (offline, zero-dependency) |
| `phase0/colchicine-stemi.html` | 6,213 | Master dashboard (Phase 0 deliverable) |

The validation-check counts above refer to the in-page self-tests summarized in `docs/validation-report.md`. A committed static-contract test harness lives in `/tests`.

## Tests

```
python -m pytest
```

Static-artifact contracts assert README claims are backed by real files, the validation report covers core methods, key dashboards expose expected markers, and all local asset links resolve.

## Status

Phase 0 COMPLETE -- all 8 sub-phases built and validated
