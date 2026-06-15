# cardiosynth — Truth-Recovery Validation

**Repo:** mahmood726-cyber/cardiosynth (living cardiology evidence synthesis)
**Engine:** core/metaengine.html (2,031 lines) — pure-JS statistical core (lines 246-895)
**Date:** 2026-06-15

## Verdict: GENUINE METHODS ENGINE — VALIDATED (textbook HKSJ recovery confirmed)

cardiosynth's core/metaengine.html is a real, reusable pairwise random-effects
meta-analysis engine (NOT a hardcoded per-condition dashboard). It ports
DerSimonian-Laird, REML (Fisher-scoring), Paule-Mandel, Peto and MH, each with
an optional HKSJ adjustment that uses the correct max(1, Q*/(k-1)) floor and a
t_{k-1} critical value — exactly per the advanced-stats rules. The statistical
core (lines 246-895) is pure JS with ZERO DOM access, so it was extracted
VERBATIM into engine.mjs (only an export block appended).

## Method

Injected a known unconditional mu (log-effect) and between-study variance tau2,
drew k published studies per simulated review (optional publication selection
from the shared seeded DGP), pooled with the engine's OWN estimators, and
measured 95%-CI coverage of the TRUE mu over 3,000 reviews per cell.

## Results (NSIM=3000, nominal 0.95)

| mu | tau2 | k | scenario | DL+Wald-z | DL+HKSJ | REML+HKSJ | PM+HKSJ | biasMu | tau2hat |
|----|------|---|----------|-----------|---------|-----------|---------|--------|---------|
| 0.20 | 0.00 | 5 | none | 0.968 | 0.996 | 0.997 | 0.996 | -0.002 | 0.017 |
| 0.20 | 0.05 | 5 | none | 0.895 | 0.962 | 0.965 | 0.961 | +0.002 | 0.060 |
| 0.20 | 0.10 | 5 | none | 0.873 | 0.950 | 0.953 | 0.949 | +0.003 | 0.107 |
| 0.20 | 0.10 | 8 | none | 0.888 | 0.935 | 0.939 | 0.929 | +0.000 | 0.104 |
| 0.20 | 0.10 | 15 | none | 0.917 | 0.944 | 0.945 | 0.938 | +0.004 | 0.100 |
| 0.20 | 0.05 | 6 | step_strong | 0.401 | 0.607 | 0.598 | 0.610 | +0.234 | 0.041 |
| 0.00 | 0.05 | 6 | copas_strong | 0.794 | 0.897 | 0.903 | 0.892 | +0.110 | 0.040 |

## Findings

1. Pooling core is correct. DL point estimate matches the closed-form RE
   inverse-variance mean to <1e-8. tau2 recovers injected heterogeneity
   accurately (0.060~0.05; 0.107/0.104/0.100~0.10). mu unbiased absent selection.

2. HKSJ RECOVERY CONFIRMED — the headline result. DL+Wald-z UNDER-COVERS at
   small k under heterogeneity: 0.873 at tau2=0.10/k=5, 0.895 at tau2=0.05/k=5.
   Applying HKSJ recovers coverage to near-nominal: +7.7pp (0.873->0.950) and
   +6.7pp (0.895->0.962) respectively — squarely in the +6-8pp band the theory
   predicts. REML+HKSJ and PM+HKSJ track DL+HKSJ. The HKSJ floor and t_{k-1}
   critical value are implemented correctly (the floor prevents the known
   CI-narrowing bug when Q<k-1). HKSJ is the DEFAULT (checkbox checked) and is
   recommended in the UI.

3. As k grows the DL+Wald deficit shrinks (0.917 at k=15) and HKSJ over-
   correction is mild — correct asymptotic behaviour.

4. HONEST NEGATIVE — no selection model. Under strong one-sided publication
   selection (step_strong) coverage collapses (DL+Wald 0.40, even DL+HKSJ only
   0.61) with +0.234 bias in mu; Copas selection gives 0.79/0.90 coverage with
   +0.11 bias. HKSJ widens CIs but CANNOT remove selection bias. The engine has
   no selection-model / trim-fill / PET-PEESE estimator on the pooling path, so
   robustness claims under suspected small-study effects are not supported.

5. No NMA FE-vs-RE CI bug applies — cardiosynth pools a single set of studies
   pairwise; there are no indirect-comparison relative-effect CIs. RE weights
   correctly use 1/(vi+tau2).

## Recommendation

- Keep / ship the validation. The pooling core is sound; the HKSJ default is the
  right call and is empirically justified here (+6-8pp coverage recovery).
  Tests pass (5/5).
- Documentation: state plainly there is no publication-bias CORRECTION; HKSJ
  fixes CI calibration, not selection bias.
- Optional future: add a selection model (Copas/step MLE) or PET-PEESE for
  selection correction.

## Files
- engine.mjs — verbatim metaengine.html statistical core (DL/REML/PM/HKSJ + helpers)
- dgp.mjs — shared seeded known-truth + publication-selection DGP
- harness.mjs — coverage/bias measurement across 4 estimators (runCoverage)
- test.mjs — 5 node --test assertions (all pass)
