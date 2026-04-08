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

## Status

Phase 0.1: CT.gov Harvester -- in progress
