// harness.mjs — coverage / bias of the cardiosynth pooling core against a
// KNOWN (mu, tau2), with optional publication selection from the shared DGP.
//
// Compares the engine's OWN estimators:
//   DL+Wald-z  (hksj:false -> theta +/- 1.96*seRE)
//   DL+HKSJ    (hksj:true  -> theta +/- t_{k-1} * seRE*sqrt(max(1,Q*/(k-1))))
//   REML+HKSJ
//   PM+HKSJ
// Coverage = fraction of 95% CIs containing the TRUE unconditional mu.

import { derSimonianLaird, reml, pauleMandel } from './engine.mjs';
import { generate, makeRng } from './dgp.mjs';

function toStudies(yi, vi) { return yi.map((y, i) => ({ yi: y, vi: vi[i] })); }

export function runCoverage({ mu, tau2, k, scenario, nSim, seed = 12345 }) {
  const rng = makeRng(seed);
  const acc = {
    dlWald: { cov: 0, w: 0 }, dlHksj: { cov: 0, w: 0 },
    remlHksj: { cov: 0, w: 0 }, pmHksj: { cov: 0, w: 0 }
  };
  let nOk = 0, sumMu = 0, sumTau2 = 0, degenerate = 0;
  for (let s = 0; s < nSim; s++) {
    const { yi, vi, info } = generate(mu, tau2, k, scenario, rng);
    if (info.degenerate) degenerate++;
    const studies = toStudies(yi, vi);
    let dlW, dlH, rmH, pmH;
    try {
      dlW = derSimonianLaird(studies, { hksj: false });
      dlH = derSimonianLaird(studies, { hksj: true });
      rmH = reml(studies, { hksj: true });
      pmH = pauleMandel(studies, { hksj: true });
    } catch (e) { continue; }
    if (!dlW || dlW.error || !Number.isFinite(dlW.theta)) continue;
    nOk++;
    const hit = (r) => r && Number.isFinite(r.ci_lower) && mu >= r.ci_lower && mu <= r.ci_upper;
    if (hit(dlW)) acc.dlWald.cov++;   acc.dlWald.w += (dlW.ci_upper - dlW.ci_lower);
    if (hit(dlH)) acc.dlHksj.cov++;   acc.dlHksj.w += (dlH.ci_upper - dlH.ci_lower);
    if (hit(rmH)) acc.remlHksj.cov++; acc.remlHksj.w += (rmH.ci_upper - rmH.ci_lower);
    if (hit(pmH)) acc.pmHksj.cov++;   acc.pmHksj.w += (pmH.ci_upper - pmH.ci_lower);
    sumMu += dlH.theta;
    sumTau2 += dlH.tau2;
  }
  const f = (o) => ({ coverage: o.cov / nOk, meanWidth: o.w / nOk });
  return {
    mu, tau2, k, scenario, nSim, nOk, degenerate,
    biasMu: (sumMu / nOk) - mu,
    meanTau2: sumTau2 / nOk,
    dlWald: f(acc.dlWald), dlHksj: f(acc.dlHksj),
    remlHksj: f(acc.remlHksj), pmHksj: f(acc.pmHksj)
  };
}

function fmt(x, d = 3) { return Number.isFinite(x) ? x.toFixed(d) : String(x); }

if (process.argv[1]?.endsWith('harness.mjs')) {
  const NSIM = 3000;
  const grid = [
    { mu: 0.20, tau2: 0.00, k: 5,  scenario: 'none' },
    { mu: 0.20, tau2: 0.05, k: 5,  scenario: 'none' },
    { mu: 0.20, tau2: 0.10, k: 5,  scenario: 'none' },
    { mu: 0.20, tau2: 0.10, k: 8,  scenario: 'none' },
    { mu: 0.20, tau2: 0.10, k: 15, scenario: 'none' },
    { mu: 0.20, tau2: 0.05, k: 6,  scenario: 'step_strong' },
    { mu: 0.00, tau2: 0.05, k: 6,  scenario: 'copas_strong' },
  ];
  console.log('cardiosynth truth-recovery coverage  (NSIM=' + NSIM + ', target 0.95)\n');
  console.log('mu    tau2  k   scenario       DLwald  DL+HKSJ  REML+HKSJ  PM+HKSJ   biasMu  tau2hat');
  for (const g of grid) {
    const r = runCoverage({ ...g, nSim: NSIM });
    console.log([
      fmt(g.mu,2), fmt(g.tau2,2), String(g.k).padStart(2), g.scenario.padEnd(13),
      fmt(r.dlWald.coverage), ' ' + fmt(r.dlHksj.coverage),
      '  ' + fmt(r.remlHksj.coverage), '  ' + fmt(r.pmHksj.coverage),
      (r.biasMu>=0?' ':'') + fmt(r.biasMu), fmt(r.meanTau2,4)
    ].join('  '));
  }
}
