# CardioSynth Validation Report

## Statistical Engine Validation

All statistical functions were ported from `C:/HTML apps/living-meta/src/lib/` and validated against R metafor 4.8.

### DerSimonian-Laird Random Effects

Test data: 5 studies with known effect sizes and variances.

| Parameter | JS Result | R metafor | Difference | Status |
|-----------|-----------|-----------|------------|--------|
| theta     | -0.3018   | -0.3018   | < 0.0001   | PASS   |
| tau2      | 0.0002    | 0.0002    | < 0.0001   | PASS   |
| se        | 0.0691    | 0.0691    | < 0.0001   | PASS   |
| I2        | 1.07%     | 1.07%     | < 0.01     | PASS   |
| Q         | 4.0432    | 4.0432    | < 0.0001   | PASS   |

### HKSJ Correction

- Uses t-distribution with df=k-1 (NOT z-distribution)
- HKSJ floor applied: max(1, Q/(k-1)) when Q < k-1
- Prediction interval uses t_{k-2} per Higgins-Thompson-Spiegelhalter 2009

Verified: t-critical values match R qt():
- df=4: JS=2.7764, R=2.7764
- df=3: JS=3.1824, R=3.1824
- df=30: JS=2.0423, R=2.0423

### Risk Ratio Calculation

- escalcRR matches metafor::escalc(measure="RR")
- Log scale pooling: always pool logRR, back-transform after
- Continuity correction: 0.5 added ONLY if any cell is zero

### Statistical Utilities

All utility functions validated:
- normalCDF: matches pnorm() to 1e-8
- normalQuantile: matches qnorm() to 1e-6
- tCDF: matches pt() to 1e-6
- chiSquareCDF: matches pchisq() to 1e-6
- gammaln: matches lgamma() to 1e-10

## TruthCert Validators

23/23 tests passing across all 10 validators.

## MetaEngine Integration

29/29 validation tests passing including:
- DS-L pooling
- HKSJ correction
- Effect size calculators (RR, OR, RD)
- Leave-one-out sensitivity
- Cumulative meta-analysis
- SVG forest plot rendering

## Bias Quantifier

46/46 tests passing:
- Non-posting bias estimation
- ORBI calculation
- Egger's radial test
- Funnel plot rendering (k>=10 guard)
