# CardioSynth: Living Cardiology Evidence Synthesis Engine

## Project Identity

Browser-native, zero-dependency, single-operator living meta-analysis engine for cardiology.
CT.gov structured results as sole primary source. Phase 0: colchicine post-STEMI.

## Architecture Principles -- Non-Negotiable

1. BROWSER-NATIVE FIRST. All computation in vanilla JS. No Node.js. No Python. No R.
2. SINGLE HTML FILES. Each tool is self-contained .html. No build step, no npm.
3. CT.GOV AS SOLE PRIMARY SOURCE. ClinicalTrials.gov API v2 only.
4. TRUTHCERT FAIL-CLOSED. Every number passes validation. Pipeline halts on unresolved critical flags.
5. PROVENANCE CHAIN ON EVERY NUMBER. NCT, results path, timestamp, extractor ID, validator verdict, witness count.
6. TWO-AGENT EXTRACTION MINIMUM. Independent dual extraction. Disagreements flagged to human.
7. METAENGINE IS THE ONLY STATISTICS ENGINE. DS-L RE, HKSJ, I2, tau2, Baujat, LOO, cumulative.

## Code Standards

- No external JS libraries
- Only fetch to clinicaltrials.gov/api/v2/
- All state in localStorage
- JSDoc on every function
- Filenames: lowercase-hyphenated
- Git commit after every Phase completion

## Error Handling

Fail loudly. Never silently accept bad data.

## Validation

Every statistical function validated against R metafor to |delta| < 0.0001.
