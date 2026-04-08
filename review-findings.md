# Multi-Persona Review: colchicine-stemi.html
### Date: 2026-04-08
### Summary: 5 P0, 6 P1, 3 P2

## False Positive Watch
- Clopper-Pearson alpha/2 IS correct
- DOR = exp(mu1 + mu2) IS correct
- Functions defined elsewhere in 3,222-line file — grep before claiming missing

---

#### P0 -- Critical

- **P0-1** [Statistical]: `hksjApplied` flag incorrect when HKSJ floor applies — CI uses t-quantile but flag reports false (line ~1824-1825)
  - Suggested fix: Set `hksjApplied = true` whenever `hksj && k >= 2`, before the multiplier check

- **P0-2** [Statistical]: No DL bias warning for k<10 — tau2 underestimates at small k (line ~1803, 2599)
  - Suggested fix: Add `result.warning = 'DL tau2 biased for k<10; consider REML/PM'` and surface in UI

- **P0-3** [Software Eng]: Harvest loop lacks per-query error handling — one API failure aborts entire pipeline (line ~2492-2503)
  - Suggested fix: Wrap `apiRequest()` in try-catch per condition query, log error, continue to next condition

- **P0-4** [Domain]: Scope ambiguity — title says "post-STEMI" but query includes chronic CAD trials (LoDoCo2, PCI, AF trials)
  - Suggested fix: Either narrow to acute MI/ACS only, or retitle to "Colchicine in Cardiovascular Disease"

- **P0-5** [Software Eng]: Div balance mismatch — 151 opening `<div>` vs 150 closing `</div>`
  - Suggested fix: Find and close the unclosed div

#### P1 -- Important

- **P1-1** [Statistical]: I2 formula in derSimonianLaird uses signal-ratio formula (tau2/(tau2+variance)) instead of Higgins formula ((Q-(k-1))/Q) — GRADE thresholds calibrated for Higgins (line ~1842)
  - Suggested fix: Replace with Higgins formula using fe.Q

- **P1-2** [Statistical]: Egger's test is standard (not radial) version — should use radial per project rules (line ~2141)
  - Suggested fix: Add comment clarifying form; recommend Peters' test for binary RR

- **P1-3** [Statistical]: autoGRADE uses only I2 thresholds, no tau2 magnitude check (line ~2168)
  - Suggested fix: Add tau2 magnitude criterion alongside I2

- **P1-4** [Security]: Unsafe localStorage restore — `Object.keys(saved).forEach` writes any key onto STATE without allowlist (line ~3212)
  - Suggested fix: Restore only known STATE keys from fixed allowlist

- **P1-5** [Security]: API `phase` field injected into innerHTML without escHtml() (line ~2835)
  - Suggested fix: Wrap with escHtml()

- **P1-6** [Security]: Unbounded Retry-After sleep — malicious header could sleep 24h (line ~1157)
  - Suggested fix: Clamp to `Math.min(retryAfter, 300)`

#### P2 -- Minor

- **P2-1** [Statistical]: E156 abstract calls autoGRADE with empty biasFlags array (line ~2204)
  - Suggested fix: Pass actual TruthCert flags

- **P2-2** [Statistical]: Return field named `z` is actually t-statistic under HKSJ (line ~1847)

- **P2-3** [UX]: Pipeline status div lacks aria-live; sortable table headers lack keyboard accessibility

---

### Status: REVIEW COMPLETE — fixes pending
