// ============================================================
// engine.mjs — VERBATIM extraction of the cardiosynth pooling core.
//
// The block below (gammaln ... reml) is copied byte-for-byte from
//   cardiosynth/core/metaengine.html  lines 246-895
// — the entire statistical core. It contains NO DOM access, so the only
// adaptation is the `export {...}` appended at the end. A `document` stub is
// provided per the sweep spec but is unused on the pooling path.
//
// Methods: Fixed-effect, DerSimonian-Laird (+HKSJ), Paule-Mandel (+HKSJ),
//          REML (Fisher-scoring, +HKSJ). HKSJ uses the max(1, Q*/(k-1))
//          floor and t_{k-1} critical value (per advanced-stats rules).
// Nothing statistical is altered. ADDITIVE harness only.
// ============================================================

const document = { getElementById: () => ({ value: '0.05' }) };

function gammaln(x) {
  const coef = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += coef[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function normalCDF(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

function incompleteBeta(a, b, x) {
  if (x === 0) return 0;
  if (x === 1) return 1;
  const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) +
              a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betacf(a, b, x) / a;
  } else {
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }
}

function betacf(a, b, x) {
  const maxIter = 100;
  const eps = 1e-10;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function tPDF(t, df) {
  const coef = Math.exp(gammaln((df + 1) / 2) - gammaln(df / 2)) /
               Math.sqrt(df * Math.PI);
  return coef * Math.pow(1 + t * t / df, -(df + 1) / 2);
}

function tCDF(t, df) {
  const x = df / (df + t * t);
  const halfBeta = 0.5 * incompleteBeta(df / 2, 0.5, x);
  return t >= 0 ? 1 - halfBeta : halfBeta;
}

function tQuantile(p, df) {
  let t = normalQuantile(p);
  for (let iter = 0; iter < 10; iter++) {
    const cdf = tCDF(t, df);
    const pdf = tPDF(t, df);
    if (Math.abs(pdf) < 1e-10) break;
    const diff = cdf - p;
    if (Math.abs(diff) < 1e-10) break;
    t = t - diff / pdf;
  }
  return t;
}

function gammainc(a, x) {
  if (x === 0) return 0;
  if (x < 0 || a <= 0) return NaN;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-14 * Math.abs(sum)) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
  }
  return 1 - gammainc_upper(a, x);
}

function gammainc_upper(a, x) {
  const fpmin = 1e-30;
  let b = x + 1 - a;
  let c = 1 / fpmin;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = b + an / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammaln(a)) * h;
}

function chiSquareCDF(x, df) {
  if (x <= 0 || df <= 0) return 0;
  return gammainc(df / 2, x / 2);
}

function chiSquarePDF(x, df) {
  if (x <= 0) return 0;
  const k = df / 2;
  return Math.pow(x, k - 1) * Math.exp(-x / 2) / (Math.pow(2, k) * Math.exp(gammaln(k)));
}

function chiSquareQuantile(p, df) {
  let x = df;
  for (let iter = 0; iter < 20; iter++) {
    const cdf = chiSquareCDF(x, df);
    const pdf = chiSquarePDF(x, df);
    if (pdf < 1e-10) break;
    const diff = cdf - p;
    if (Math.abs(diff) < 1e-8) break;
    x = Math.max(0.001, x - diff / pdf);
  }
  return x;
}

function pchisq(x, df) {
  if (x <= 0) return 0;
  return gammainc(df / 2, x / 2);
}

function i2ConfidenceInterval(Q, k) {
  if (k < 2) return { lower: 0, upper: 0 };
  const df = k - 1;
  const qLower = chiSquareQuantile(0.025, df);
  const qUpper = chiSquareQuantile(0.975, df);
  let lower = Q > qUpper ? ((Q - qUpper) / Q) * 100 : 0;
  let upper = Q > qLower ? ((Q - qLower) / Q) * 100 : 0;
  lower = Math.max(0, Math.min(100, lower));
  upper = Math.max(0, Math.min(100, upper));
  return { lower, upper };
}


// ============================================================================
// CORE META-ANALYSIS: computeMAState (ported from meta-cache.js)
// ============================================================================

// Numerical guard: floor SE at 1e-8 (variance 1e-16) before inverse-variance
// weighting so that underflowed or degenerate-precision variances do not
// produce Infinity weights. Fires console.warn when applied so data-quality
// signals are not silently clamped away.
const SE_FLOOR = 1e-8;
const V_FLOOR = SE_FLOOR * SE_FLOOR;

function computeMAState(studies) {
  const k = studies.length;
  if (k === 0) return null;

  const yi = new Float64Array(k);
  const vi = new Float64Array(k);
  const weights = new Float64Array(k);

  let totalWeight = 0;
  let sumWY = 0;
  let sumW2 = 0;

  for (let i = 0; i < k; i++) {
    yi[i] = studies[i].yi;
    vi[i] = studies[i].vi;
    if (vi[i] < V_FLOOR) {
      console.warn('[cardiosynth] SE floor applied: study=' +
                   (studies[i].id || studies[i].nctId || i) +
                   ' vi=' + Number(vi[i]).toExponential(3) +
                   ' -> ' + V_FLOOR.toExponential(3));
      vi[i] = V_FLOOR;
    }
    weights[i] = 1 / vi[i];
    totalWeight += weights[i];
    sumWY += weights[i] * yi[i];
    sumW2 += weights[i] * weights[i];
  }

  const thetaFE = sumWY / totalWeight;

  let Q = 0;
  for (let i = 0; i < k; i++) {
    const diff = yi[i] - thetaFE;
    Q += weights[i] * diff * diff;
  }

  const c = totalWeight - sumW2 / totalWeight;
  const tau2 = Math.max(0, (Q - (k - 1)) / c);
  const tau = Math.sqrt(tau2);

  const reWeights = new Float64Array(k);
  let reTotalWeight = 0;
  let reSumWY = 0;

  for (let i = 0; i < k; i++) {
    reWeights[i] = 1 / (vi[i] + tau2);
    reTotalWeight += reWeights[i];
    reSumWY += reWeights[i] * yi[i];
  }

  const thetaRE = reSumWY / reTotalWeight;
  const seRE = Math.sqrt(1 / reTotalWeight);
  const seFE = Math.sqrt(1 / totalWeight);
  const I2 = Q > k - 1 ? ((Q - (k - 1)) / Q) * 100 : 0;

  return {
    k, yi, vi,
    weights, totalWeight, thetaFE, seFE,
    reWeights, reTotalWeight, thetaRE, seRE,
    Q, tau2, tau, I2, c
  };
}


// ============================================================================
// FIXED EFFECTS (ported from meta-fe.js)
// ============================================================================

function fixedEffects(studies) {
  const validStudies = studies.filter(s =>
    s.yi !== null && s.vi !== null &&
    !isNaN(s.yi) && !isNaN(s.vi) && s.vi > 0
  );
  if (validStudies.length === 0) return { error: 'No valid studies' };

  const state = computeMAState(validStudies);
  const { k, totalWeight } = state;
  const theta = state.thetaFE;
  const se = state.seFE;
  const variance = 1 / totalWeight;
  const ci_lower = theta - 1.96 * se;
  const ci_upper = theta + 1.96 * se;
  const df = k - 1;
  const Q = state.Q;
  const pQ = 1 - chiSquareCDF(Q, df);
  const H2 = df > 0 ? Q / df : 1;
  const zTest = theta / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zTest)));

  return {
    model: 'FE', k, theta, se, variance,
    ci_lower, ci_upper, z: zTest, pValue,
    Q, df, pQ, I2: state.I2, H2,
    weights: validStudies.map((s, i) => ({
      id: s.id || s.nctId || i,
      yi: s.yi, vi: s.vi,
      weight: state.weights[i],
      weightPercent: (state.weights[i] / totalWeight) * 100
    }))
  };
}


// ============================================================================
// DERSIMONIAN-LAIRD with HKSJ (ported from meta-dl.js)
// ============================================================================

function derSimonianLaird(studies, options) {
  if (options === undefined) options = {};
  const hksj = options.hksj !== undefined ? options.hksj : true;

  const validStudies = studies.filter(s =>
    s.yi !== null && s.vi !== null &&
    !isNaN(s.yi) && !isNaN(s.vi) && s.vi > 0
  );
  if (validStudies.length === 0) return { error: 'No valid studies' };

  const state = computeMAState(validStudies);
  const {
    k, thetaFE, seFE,
    thetaRE: theta, seRE,
    reWeights: wiStar, reTotalWeight: sumWiStar,
    tau2, Q, I2: stateI2, totalWeight: sumWi
  } = state;

  let se = seRE;
  const fe = fixedEffects(validStudies);
  const variance = 1 / sumWiStar;

  let ci_lower = theta - 1.96 * se;
  let ci_upper = theta + 1.96 * se;

  let hksjApplied = false;
  let qStar = null;
  let tCrit = null;

  if (hksj && k >= 2) {
    // Q* statistic with RE weights
    qStar = validStudies.reduce(function(sum, s, i) {
      return sum + wiStar[i] * Math.pow(s.yi - theta, 2);
    }, 0);

    // HKSJ variance multiplier with floor: max(1, Q*/(k-1))
    // Per advanced-stats rules: If Q < k-1, HKSJ narrows CI below DL - set floor
    const hksjMultiplier = Math.max(1, qStar / (k - 1));

    if (hksjMultiplier > 1) {
      se = se * Math.sqrt(hksjMultiplier);
      hksjApplied = true;
    }

    // Use t-distribution with df = k-1 (NOT qnorm - per rules)
    tCrit = tQuantile(0.975, k - 1);
    ci_lower = theta - tCrit * se;
    ci_upper = theta + tCrit * se;
  }

  // Prediction interval (df = k-1 per Cochrane Handbook v6.5; matches metafor predict v4+.
  // IntHout-2016 t_{k-2} is superseded.)
  let pi_lower = null;
  let pi_upper = null;
  if (k >= 3) {
    const piDF = k - 1;
    const piTCrit = tQuantile(0.975, piDF);
    const piSE = Math.sqrt(variance + tau2);
    pi_lower = theta - piTCrit * piSE;
    pi_upper = theta + piTCrit * piSE;
  }

  const zTest = theta / se;
  const pValue = hksj
    ? 2 * (1 - tCDF(Math.abs(zTest), k - 1))
    : 2 * (1 - normalCDF(Math.abs(zTest)));

  const tau = Math.sqrt(tau2);
  const typicalVariance = variance;
  const I2 = tau2 > 0 ? (tau2 / (tau2 + typicalVariance)) * 100 : 0;
  const I2CI = i2ConfidenceInterval(fe.Q, k);
  const H2 = tau2 > 0 ? 1 + tau2 / typicalVariance : 1;

  return {
    model: 'RE-DL', k, theta, se, variance,
    ci_lower, ci_upper, z: zTest, pValue,
    tau2, tau, pi_lower, pi_upper,
    Q: fe.Q, df: k - 1, pQ: fe.pQ,
    I2, I2_lower: I2CI.lower, I2_upper: I2CI.upper, H2,
    hksj: hksjApplied, qStar,
    weights: validStudies.map(function(s, i) {
      return {
        id: s.id || s.nctId || i,
        yi: s.yi, vi: s.vi,
        weight: state.reWeights[i],
        weightPercent: (state.reWeights[i] / sumWiStar) * 100
      };
    }),
    fe: {
      theta: fe.theta, se: fe.se,
      ci_lower: fe.ci_lower, ci_upper: fe.ci_upper
    }
  };
}


// ============================================================================
// PAULE-MANDEL ESTIMATOR (ported from meta-dl.js)
// ============================================================================

function pauleMandel(studies, options) {
  if (options === undefined) options = {};
  const maxIter = options.maxIter || 100;
  const tol = options.tol || 1e-8;
  const hksj = options.hksj !== undefined ? options.hksj : true;

  const validStudies = studies.filter(s =>
    s.yi !== null && s.vi !== null &&
    !isNaN(s.yi) && !isNaN(s.vi) && s.vi > 0
  );
  if (validStudies.length === 0) return { error: 'No valid studies' };

  const k = validStudies.length;
  const target = k - 1;

  function computeQstar(tau2) {
    const wi = validStudies.map(s => 1 / (s.vi + tau2));
    const sumWi = wi.reduce(function(a, b) { return a + b; }, 0);
    const theta = validStudies.reduce(function(sum, s, i) { return sum + wi[i] * s.yi; }, 0) / sumWi;
    return validStudies.reduce(function(sum, s, i) {
      return sum + wi[i] * Math.pow(s.yi - theta, 2);
    }, 0);
  }

  const Q0 = computeQstar(0);
  let tau2 = 0;
  let converged = true;

  if (Q0 > target) {
    let lower = 0;
    let upper = 1;
    while (computeQstar(upper) > target && upper < 1e10) upper *= 2;

    if (upper >= 1e10) {
      const dlResult = derSimonianLaird(validStudies, { hksj: false });
      tau2 = dlResult.tau2;
      converged = false;
    } else {
      converged = false;
      for (let iter = 0; iter < maxIter; iter++) {
        tau2 = (lower + upper) / 2;
        const Qmid = computeQstar(tau2);
        if (Math.abs(Qmid - target) < tol) { converged = true; break; }
        if (Qmid > target) { lower = tau2; } else { upper = tau2; }
        if (upper - lower < tol) { converged = true; break; }
      }
    }
  }

  const wiStar = validStudies.map(s => 1 / (s.vi + tau2));
  const sumWiStar = wiStar.reduce(function(a, b) { return a + b; }, 0);
  const theta = validStudies.reduce(function(sum, s, i) { return sum + wiStar[i] * s.yi; }, 0) / sumWiStar;
  const variance = 1 / sumWiStar;
  let se = Math.sqrt(variance);

  const dlResult = derSimonianLaird(validStudies, { hksj: false });

  let ci_lower, ci_upper;
  let hksjApplied = false;
  if (hksj && k >= 2) {
    const qStar = computeQstar(tau2);
    const hksjMult = Math.max(1, qStar / (k - 1));
    if (hksjMult > 1) {
      se = se * Math.sqrt(hksjMult);
      hksjApplied = true;
    }
    const tc = tQuantile(0.975, k - 1);
    ci_lower = theta - tc * se;
    ci_upper = theta + tc * se;
  } else {
    ci_lower = theta - 1.96 * se;
    ci_upper = theta + 1.96 * se;
  }

  let pi_lower = null, pi_upper = null;
  if (k >= 3) {
    const piTCrit = tQuantile(0.975, k - 1);
    const piSE = Math.sqrt(variance + tau2);
    pi_lower = theta - piTCrit * piSE;
    pi_upper = theta + piTCrit * piSE;
  }

  const I2 = tau2 > 0 ? (tau2 / (tau2 + variance)) * 100 : 0;

  return {
    model: 'RE-PM', estimator: 'Paule-Mandel',
    k, theta, se, variance, ci_lower, ci_upper,
    tau2, tau: Math.sqrt(tau2), pi_lower, pi_upper,
    converged, hksj: hksjApplied,
    Q: dlResult.Q, I2,
    weights: validStudies.map(function(s, i) {
      return {
        id: s.id || s.nctId || i,
        yi: s.yi, vi: s.vi,
        weight: wiStar[i],
        weightPercent: (wiStar[i] / sumWiStar) * 100
      };
    })
  };
}


// ============================================================================
// REML ESTIMATOR (ported from meta-dl.js)
// ============================================================================

function reml(studies, options) {
  if (options === undefined) options = {};
  const maxIter = options.maxIter || 100;
  const tol = options.tol || 1e-8;
  const hksj = options.hksj !== undefined ? options.hksj : true;

  const validStudies = studies.filter(s =>
    s.yi !== null && s.vi !== null &&
    !isNaN(s.yi) && !isNaN(s.vi) && s.vi > 0
  );
  if (validStudies.length === 0) return { error: 'No valid studies' };

  const k = validStudies.length;
  const yiArr = validStudies.map(s => s.yi);
  const viArr = validStudies.map(s => s.vi);

  const dlResult = derSimonianLaird(validStudies, { hksj: false });
  let tau2 = Math.max(0, dlResult.tau2);

  let converged = false;
  let iter = 0;

  for (iter = 0; iter < maxIter; iter++) {
    const wi = viArr.map(v => 1 / (v + tau2));
    const sumWi = wi.reduce(function(a, b) { return a + b; }, 0);
    const thetaEst = yiArr.reduce(function(sum, y, i) { return sum + wi[i] * y; }, 0) / sumWi;

    let sumW2 = 0, sumW2resid = 0, sumW3 = 0;
    for (let i = 0; i < k; i++) {
      sumW2 += wi[i] * wi[i];
      sumW2resid += wi[i] * wi[i] * Math.pow(yiArr[i] - thetaEst, 2);
      sumW3 += wi[i] * wi[i] * wi[i];
    }

    const deriv1 = -0.5 * sumWi + 0.5 * sumW2resid + 0.5 * (sumW2 / sumWi);
    const fisherInfo = 0.5 * (sumW2 - sumW3 / sumWi);
    if (fisherInfo <= 0) break;

    const tau2New = tau2 + deriv1 / fisherInfo;
    const tau2Bounded = Math.max(0, tau2New);

    if (Math.abs(tau2Bounded - tau2) < tol) { tau2 = tau2Bounded; converged = true; break; }
    tau2 = tau2Bounded;
  }

  const wiStar = viArr.map(v => 1 / (v + tau2));
  const sumWiStar = wiStar.reduce(function(a, b) { return a + b; }, 0);
  const theta = yiArr.reduce(function(sum, y, i) { return sum + wiStar[i] * y; }, 0) / sumWiStar;
  const variance = 1 / sumWiStar;
  let se = Math.sqrt(variance);

  let ci_lower, ci_upper;
  let hksjApplied = false;
  if (hksj && k >= 2) {
    const qStar = yiArr.reduce(function(sum, y, i) {
      return sum + wiStar[i] * Math.pow(y - theta, 2);
    }, 0);
    const hksjMult = Math.max(1, qStar / (k - 1));
    if (hksjMult > 1) {
      se = se * Math.sqrt(hksjMult);
      hksjApplied = true;
    }
    const tc = tQuantile(0.975, k - 1);
    ci_lower = theta - tc * se;
    ci_upper = theta + tc * se;
  } else {
    ci_lower = theta - 1.96 * se;
    ci_upper = theta + 1.96 * se;
  }

  let pi_lower = null, pi_upper = null;
  if (k >= 3) {
    const piTCrit = tQuantile(0.975, k - 1);
    const piSE = Math.sqrt(variance + tau2);
    pi_lower = theta - piTCrit * piSE;
    pi_upper = theta + piTCrit * piSE;
  }

  const I2 = tau2 > 0 ? (tau2 / (tau2 + variance)) * 100 : 0;
  const I2CI = i2ConfidenceInterval(dlResult.Q, k);

  const zTest = theta / se;
  const pValue = hksj
    ? 2 * (1 - tCDF(Math.abs(zTest), k - 1))
    : 2 * (1 - normalCDF(Math.abs(zTest)));

  return {
    model: 'RE-REML', estimator: 'REML',
    k, theta, se, variance, ci_lower, ci_upper,
    z: zTest, pValue, tau2, tau: Math.sqrt(tau2),
    pi_lower, pi_upper, converged, iterations: iter + 1,
    hksj: hksjApplied,
    Q: dlResult.Q, df: k - 1, pQ: dlResult.pQ,
    I2, I2_lower: I2CI.lower, I2_upper: I2CI.upper,
    weights: validStudies.map(function(s, i) {
      return {
        id: s.id || s.nctId || i,
        yi: s.yi, vi: s.vi,
        weight: wiStar[i],
        weightPercent: (wiStar[i] / sumWiStar) * 100
      };
    }),
    fe: {
      theta: dlResult.fe.theta, se: dlResult.fe.se,
      ci_lower: dlResult.fe.ci_lower, ci_upper: dlResult.fe.ci_upper
    }
  };
}

// ---- exports (additive) ----
export {
  fixedEffects, derSimonianLaird, pauleMandel, reml,
  computeMAState, tQuantile, tCDF, normalCDF, chiSquareCDF, document
};
