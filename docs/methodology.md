# CardioSynth Methodology

## Data Source

ClinicalTrials.gov API v2 (`https://clinicaltrials.gov/api/v2/studies`) is the sole primary data source. Only structured results data (posted to CT.gov) is used. No PDF extraction, no PubMed full-text parsing.

## Extraction Process

1. **Harvest**: CT.gov API queried for condition + intervention with results filter
2. **Extract**: Each study's structured results parsed into standardized ExtractionObject
3. **Dual-agent**: Two independent extractions compared field-by-field (1% numeric tolerance, 0.95 string similarity)
4. **Arbitration**: Disagreements flagged to human review queue
5. **Merge**: Agreed extractions merged with witness_count=2

## Validation (TruthCert)

10 validators execute in strict order, halting on CRITICAL:

1. ARM_SWAP_DETECTOR - Arm label vs type consistency
2. TIMEPOINT_DRIFT - Registered vs reported timeframe
3. UNIT_CHECKER - Plausible spread ranges for continuous outcomes
4. TOTAL_CHECKER - Analyzed <= enrolled
5. EVENT_RATE_PLAUSIBILITY - Events <= participants
6. ZERO_CELL_HANDLER - Flags zero cells for method selection
7. DUPLICATE_DETECTOR - NCT uniqueness + title similarity
8. MULTIARM_ADJUSTER - Flags >2 arm trials
9. OUTCOME_SWITCHING_DETECTOR - Registered vs reported primary outcome
10. REGISTRATION_TIMING - Pre-registration verification

Only extractions with no CRITICAL flags enter synthesis.

## Statistical Methods

- **Effect measure**: Log Risk Ratio (binary outcomes), Mean Difference (continuous)
- **Pooling**: DerSimonian-Laird random effects with HKSJ variance correction
- **Heterogeneity**: I-squared, tau-squared, Cochran's Q
- **Sensitivity**: Leave-one-out, cumulative meta-analysis
- **Prediction interval**: t_{k-2} distribution per Higgins-Thompson-Spiegelhalter 2009

All computations validated against R metafor to |delta| < 0.0001.

## Bias Assessment

- **Non-posting bias**: Posting rate stratified by sponsor type and phase
- **ORBI**: Outcome Registration Bias Index (registered vs reported primary outcome)
- **Publication bias**: Funnel plot (k>=10) and Egger's radial test

## Living Update Protocol

- Manual refresh via CT.gov API (Phase 0)
- Each synthesis state versioned with SHA-256 hash
- Full provenance chain maintained for every number
