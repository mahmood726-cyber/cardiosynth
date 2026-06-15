// test.mjs — node --test
// Validates the cardiosynth pooling core against known truth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derSimonianLaird, reml } from './engine.mjs';
import { runCoverage } from './harness.mjs';

const S = (yi, vi) => yi.map((y, i) => ({ yi: y, vi: vi[i] }));

// 1. DL point estimate matches closed-form RE inverse-variance mean.
test('DL theta matches closed-form RE inverse-variance mean', () => {
  const yi = [0.10, 0.20, -0.05, 0.15, 0.00, 0.30, 0.05];
  const vi = [0.04, 0.05, 0.03, 0.06, 0.02, 0.08, 0.04];
  const r = derSimonianLaird(S(yi, vi), { hksj: false });
  const w = vi.map(v => 1 / (v + r.tau2));
  const re = yi.reduce((s, y, i) => s + w[i] * y, 0) / w.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(r.theta - re) < 1e-8, `theta ${r.theta} vs RE mean ${re}`);
});

// 2. DL tau2 recovers injected heterogeneity within MC error.
test('DL tau2 recovers injected heterogeneity', () => {
  const r = runCoverage({ mu: 0.2, tau2: 0.10, k: 10, scenario: 'none', nSim: 2000, seed: 7 });
  assert.ok(Math.abs(r.meanTau2 - 0.10) < 0.02, `tau2hat ${r.meanTau2} not near 0.10`);
});

// 3. CORE CLAIM: HKSJ recovers coverage that DL+Wald loses at small k under
//    heterogeneity (the +6-8pp HKSJ recovery).
test('HKSJ recovers coverage lost by DL+Wald at small k', () => {
  const r = runCoverage({ mu: 0.2, tau2: 0.05, k: 5, scenario: 'none', nSim: 3000, seed: 11 });
  assert.ok(r.dlWald.coverage < 0.93, `DL+Wald ${r.dlWald.coverage} should under-cover`);
  assert.ok(r.dlHksj.coverage >= 0.94, `DL+HKSJ ${r.dlHksj.coverage} should be near-nominal`);
  assert.ok(r.dlHksj.coverage - r.dlWald.coverage >= 0.04,
    `HKSJ lift ${(r.dlHksj.coverage - r.dlWald.coverage).toFixed(3)} should be >= +4pp`);
});

// 4. REML+HKSJ also near-nominal and approximately unbiased absent selection.
test('REML+HKSJ near-nominal coverage, mu unbiased', () => {
  const r = runCoverage({ mu: 0.2, tau2: 0.10, k: 8, scenario: 'none', nSim: 3000, seed: 13 });
  assert.ok(r.remlHksj.coverage >= 0.92 && r.remlHksj.coverage <= 0.98,
    `REML+HKSJ ${r.remlHksj.coverage} outside [0.92,0.98]`);
  assert.ok(Math.abs(r.biasMu) < 0.02, `bias ${r.biasMu} too large`);
});

// 5. HONEST NEGATIVE: strong publication selection biases mu and breaks
//    coverage for ALL methods (engine has no selection model).
test('publication selection breaks coverage for all methods', () => {
  const r = runCoverage({ mu: 0.2, tau2: 0.05, k: 6, scenario: 'step_strong', nSim: 2000, seed: 17 });
  assert.ok(r.biasMu > 0.10, `selection bias ${r.biasMu} unexpectedly small`);
  assert.ok(r.dlHksj.coverage < 0.80, `even HKSJ coverage ${r.dlHksj.coverage} too high under selection`);
});
