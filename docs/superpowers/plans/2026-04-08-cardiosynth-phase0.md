# CardioSynth Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, provenance-tracked living meta-analysis of colchicine post-STEMI, from CT.gov harvest through pooled forest plot, in self-contained HTML files.

**Architecture:** Port validated statistical code from `C:/HTML apps/living-meta/src/lib/` (DS-L, HKSJ, binary methods, CT.gov API client) into single-file HTML tools. Each tool is self-contained — no imports, no build step, no external libraries. All state in localStorage.

**Tech Stack:** Vanilla JavaScript, CT.gov API v2, SVG for plots, localStorage for persistence.

**Source code locations for porting:**
- `C:/HTML apps/living-meta/src/lib/ctgov-api.js` — CT.gov API v2 client (546 lines)
- `C:/HTML apps/living-meta/src/lib/meta-dl.js` — DS-L, PM, REML, LOO, cumulative (843 lines)
- `C:/HTML apps/living-meta/src/lib/meta-fe.js` — Fixed effects, LOO, cumulative, subgroup (385 lines)
- `C:/HTML apps/living-meta/src/lib/meta-cache.js` — computeMAState single-pass optimizer (377 lines)
- `C:/HTML apps/living-meta/src/lib/binary-methods.js` — MH OR/RR/RD, Peto OR, BetaBinomial (796 lines)

---

### Task 1: Project Scaffold + CLAUDE.md

**Files:**
- Create: `C:/cardiosynth/CLAUDE.md`
- Create: `C:/cardiosynth/README.md`
- Directories already created: core/, harvesters/, validators/, synthesis/, phase0/, docs/

- [ ] **Step 1: Write CLAUDE.md**

Save the full project prompt (provided by user) as `CLAUDE.md` in project root.

- [ ] **Step 2: Write README.md**

```markdown
# CardioSynth: Living Cardiology Evidence Synthesis Engine

Browser-native, zero-dependency, provenance-tracked living meta-analysis engine for cardiology.
Draws exclusively on ClinicalTrials.gov structured results data.

## Phase 0: Colchicine post-STEMI

One complete, publishable living meta-analysis delivered end-to-end.

## Architecture

- Single HTML files — open in browser, works immediately
- CT.gov API v2 as sole data source
- TruthCert fail-closed validation on every number
- Two-agent extraction with human arbitration
- DerSimonian-Laird random effects (HKSJ-corrected), validated against R metafor

## Structure

- `/core` — MetaEngine, TruthCert, provenance store, disagreement queue
- `/harvesters` — CT.gov harvester, cardiology classifier, results extractor
- `/validators` — 10 validation modules (arm swap, timepoint drift, etc.)
- `/synthesis` — Dashboard, NMA engine, bias quantifier
- `/phase0` — Colchicine-STEMI deliverables

## Status

Phase 0.1: CT.gov Harvester — in progress
```

- [ ] **Step 3: Commit scaffold**

```bash
cd C:/cardiosynth
git add CLAUDE.md README.md
git commit -m "Phase 0 scaffold: project structure and documentation"
```

---

### Task 2: CT.gov Harvester (Phase 0.1)

**Files:**
- Create: `C:/cardiosynth/harvesters/ct-harvester.html`
- Source: Port from `C:/HTML apps/living-meta/src/lib/ctgov-api.js`

This is the largest task. The harvester must query CT.gov API v2, paginate, cache results, filter for cardiology, and display a sortable table.

- [ ] **Step 1: Create ct-harvester.html with full implementation**

The file must contain:
1. Rate-limited CT.gov API v2 client (ported from living-meta ctgov-api.js)
2. Query builder with condition, intervention, date range, results-only toggle
3. Cardiology MeSH classifier (14 terms)
4. Pagination handler (auto-fetch all pages)
5. localStorage cache (keyed by query hash + timestamp)
6. Sortable results table with export to JSON
7. Hardcoded Phase 0 query: condition="myocardial infarction", intervention="colchicine", results_only=true

Key porting decisions:
- Remove all `import`/`export` statements from ctgov-api.js
- Inline `retry()` and `sleep()` utilities (they were in utils.js)
- Replace worker-based architecture with direct async/await
- The `buildQueryString()`, `searchStudies()`, `getStudy()`, `parseStudy()` functions port directly
- Add `hasResults` filter using `query.term` approach since API v2 filter for results uses different param

API v2 endpoints:
- Search: `GET https://clinicaltrials.gov/api/v2/studies?query.cond=X&query.intr=Y&filter.overallStatus=COMPLETED&pageSize=100&countTotal=true`
- Single study: `GET https://clinicaltrials.gov/api/v2/studies/{NCT_ID}`
- For results-only: include `filter.resultsFirstPostDate=MIN,MAX` (limits to studies that posted results between any dates)

Cardiology MeSH terms for classification:
```javascript
const CARDIO_MESH = [
  'myocardial infarction', 'acute coronary syndrome', 'stemi', 'nstemi',
  'heart failure', 'atrial fibrillation', 'coronary artery disease',
  'hypertension', 'cardiac arrest', 'ventricular arrhythmia',
  'cardiomyopathy', 'pericarditis', 'aortic stenosis', 'pulmonary hypertension'
];
```

Classification: check study conditions + keywords + title against CARDIO_MESH (case-insensitive substring match).

Cache key: `cardiosynth_harvest_${SHA256(JSON.stringify(queryParams))}_${timestamp}`. Use a simple hash function (djb2 or similar) since SHA-256 Web Crypto is async.

UI layout:
- Header with title "CardioSynth CT.gov Harvester"
- Query form: condition input, intervention input, date range (from/to), results-only checkbox, study type dropdown
- Search button with progress indicator
- Results count and pagination info
- Sortable table columns: NCT ID, Title, Status, Has Results, Primary Completion Date, Sponsor Type, Cardiology Match
- Export JSON button
- Pre-filled with Phase 0 defaults

- [ ] **Step 2: Test harvester in browser**

Open `ct-harvester.html` in Chrome. Click Search with default query (colchicine + MI).

Expected results:
- COLCOT (NCT02551094) MUST appear in results
- Multiple studies returned
- Cardiology flag = true for all MI-related studies
- Results cached in localStorage

Run: Open Chrome DevTools → Console. Verify no errors. Check localStorage for cached data.

- [ ] **Step 3: Verify COLCOT is in results**

Critical validation: Search results MUST contain NCT02551094 (COLCOT trial).
If missing, the harvester has failed — debug the query parameters.

Also attempt to find LoDoCo2. The correct NCT is NCT02278471 (not NCT02174paper as noted in spec — that was a typo).

- [ ] **Step 4: Commit**

```bash
cd C:/cardiosynth
git add harvesters/ct-harvester.html
git commit -m "Phase 0.1 complete: CT.gov harvester — COLCOT validated in results"
```

---

### Task 3: Results Extractor (Phase 0.2)

**Files:**
- Create: `C:/cardiosynth/harvesters/results-extractor.html`
- Source: Port `parseStudy()` from `C:/HTML apps/living-meta/src/lib/ctgov-api.js` lines 272-471

The extractor fetches a single study by NCT ID, parses the resultsSection, and outputs a structured ExtractionObject.

- [ ] **Step 1: Create results-extractor.html**

Must implement:
1. NCT ID input field
2. Fetch from `https://clinicaltrials.gov/api/v2/studies/{NCT_ID}` (reuse rate limiter from harvester)
3. Parse `resultsSection.outcomeMeasuresModule.outcomeMeasures` — for each outcome: title, description, timeFrame, type (PRIMARY/SECONDARY), groups, measurements (value, spread, spreadType)
4. Parse `resultsSection.adverseEventsModule` — total participants, serious AE counts, death counts per arm
5. Parse `resultsSection.participantFlowModule` — enrollment, completed, discontinued per arm
6. Parse `protocolSection.armsInterventionsModule` — arm labels, types, intervention names
7. Parse `protocolSection.outcomesModule` — registered primary/secondary outcomes (for outcome switching detection)
8. Output ExtractionObject matching the schema in spec (nct, extraction_timestamp, extractor_id, study_metadata, arms, outcomes, adverse_events, provenance)
9. Compute raw_hash: SHA-256 of the raw JSON response (use SubtleCrypto)
10. Display parsed data in structured view
11. Export ExtractionObject as JSON

Key parsing logic for arms:
```javascript
function classifyArmType(arm, interventions) {
  const label = (arm.label || '').toLowerCase();
  const type = (arm.type || '').toUpperCase();
  if (type === 'EXPERIMENTAL' || label.includes('experimental')) return 'EXPERIMENTAL';
  if (type === 'PLACEBO_COMPARATOR' || label.includes('placebo')) return 'PLACEBO';
  if (type === 'ACTIVE_COMPARATOR' || label.includes('comparator') || label.includes('control')) return 'COMPARATOR';
  if (type === 'NO_INTERVENTION') return 'COMPARATOR';
  return type || 'UNKNOWN';
}
```

Key parsing for outcomes:
```javascript
function parseOutcomeMeasures(outcomeMeasures, groups) {
  return (outcomeMeasures || []).map((om, idx) => ({
    outcome_id: `OM_${idx + 1}`,
    title: om.title,
    type: om.type, // 'PRIMARY' or 'SECONDARY' or 'OTHER' or 'POST_HOC'
    timeframe: om.timeFrame,
    measure_type: inferMeasureType(om.paramType), // COUNT, MEAN, MEDIAN, NUMBER
    unit: om.unitOfMeasure,
    dispersion_type: om.dispersionType,
    data: extractMeasurementData(om, groups)
  }));
}

function inferMeasureType(paramType) {
  if (!paramType) return 'NUMBER';
  const pt = paramType.toUpperCase();
  if (pt.includes('COUNT') || pt.includes('NUMBER')) return 'COUNT';
  if (pt.includes('MEAN')) return 'MEAN';
  if (pt.includes('MEDIAN')) return 'MEDIAN';
  if (pt.includes('LEAST_SQUARES_MEAN')) return 'MEAN';
  return 'NUMBER';
}

function extractMeasurementData(outcomeMeasure, groups) {
  const data = [];
  (outcomeMeasure.classes || []).forEach(cls => {
    (cls.categories || []).forEach(cat => {
      (cat.measurements || []).forEach(m => {
        data.push({
          arm_id: m.groupId,
          arm_label: groups.find(g => g.id === m.groupId)?.title || m.groupId,
          value: parseFloat(m.value) || null,
          spread: parseFloat(m.spread) || null,
          lower_limit: parseFloat(m.lowerLimit) || null,
          upper_limit: parseFloat(m.upperLimit) || null,
          spread_type: outcomeMeasure.dispersionType || '',
          participants: parseInt(m.comment?.match(/n=(\d+)/)?.[1]) || null
        });
      });
    });
  });
  return data;
}
```

- [ ] **Step 2: Test with COLCOT (NCT02551094)**

Open results-extractor.html, enter NCT02551094, click Extract.

Validate:
- Primary outcome title contains "cardiovascular" (MACE composite)
- Total N approximately 4745
- Two arms: colchicine 0.5mg daily vs placebo
- Arm types correctly classified (EXPERIMENTAL vs PLACEBO)
- Adverse events parsed with death counts

- [ ] **Step 3: Test ExtractionObject schema compliance**

Verify output JSON matches spec schema exactly:
- nct, extraction_timestamp (ISO8601), extractor_id present
- study_metadata has title, phase, sponsor_type, enrollment_actual, primary_completion_date
- arms array has arm_id, arm_label, arm_type, n_randomized, n_analyzed
- outcomes array has outcome_id, title, type, timeframe, measure_type, data array
- provenance has source_url, api_version, raw_hash

- [ ] **Step 4: Commit**

```bash
cd C:/cardiosynth
git add harvesters/results-extractor.html
git commit -m "Phase 0.2 complete: results extractor — COLCOT extraction validated"
```

---

### Task 4: TruthCert Validator Suite (Phase 0.3)

**Files:**
- Create: `C:/cardiosynth/core/truthcert.html`

Implements 10 validators in strict order, halting on CRITICAL. Each validator is a pure function that takes an ExtractionObject and returns flags.

- [ ] **Step 1: Create truthcert.html with 10 validators**

Validators (run in this order, halt pipeline on CRITICAL):

1. **ARM_SWAP_DETECTOR** — Check arm_type vs arm_label. CRITICAL if "placebo" label has type=EXPERIMENTAL.
```javascript
function armSwapDetector(extraction) {
  const flags = [];
  for (const arm of extraction.arms) {
    const label = (arm.arm_label || '').toLowerCase();
    const type = arm.arm_type;
    if ((label.includes('placebo') || label.includes('control')) && type === 'EXPERIMENTAL') {
      flags.push({ validator: 'ARM_SWAP_DETECTOR', severity: 'CRITICAL',
        field: `arms.${arm.arm_id}.arm_type`, message: `Arm "${arm.arm_label}" labelled as EXPERIMENTAL but contains placebo/control keywords`,
        raw_values: { arm_label: arm.arm_label, arm_type: type } });
    }
    if ((label.includes('experimental') || label.includes('treatment') || label.includes('active')) && type === 'PLACEBO') {
      flags.push({ validator: 'ARM_SWAP_DETECTOR', severity: 'CRITICAL',
        field: `arms.${arm.arm_id}.arm_type`, message: `Arm "${arm.arm_label}" labelled as PLACEBO but contains treatment keywords`,
        raw_values: { arm_label: arm.arm_label, arm_type: type } });
    }
  }
  return flags;
}
```

2. **TIMEPOINT_DRIFT** — Compare registered vs reported primary outcome timeframe. WARNING if mismatch, CRITICAL if >20% duration difference.

3. **UNIT_CHECKER** — Check continuous outcomes for plausible spread ranges. WARNING if spread > 3x value.

4. **TOTAL_CHECKER** — sum(n_analyzed) must be <= enrollment_actual. CRITICAL if violated.

5. **EVENT_RATE_PLAUSIBILITY** — For COUNT measures, value must be <= participants. CRITICAL if violated.

6. **ZERO_CELL_HANDLER** — Flag any binary outcome with zero events in any arm. INFO flag for Peto OR method selection.

7. **DUPLICATE_DETECTOR** — Check NCT uniqueness + title similarity >85% (Levenshtein) against existing pool. CRITICAL if duplicate.

8. **MULTIARM_ADJUSTER** — Flag studies with >2 arms for human arbitration. WARNING severity.

9. **OUTCOME_SWITCHING_DETECTOR** — Compare registered primary outcome title vs reported. WARNING if <70% similarity, CRITICAL if <40%.

10. **REGISTRATION_TIMING** — Check studyFirstSubmitDate < primaryCompletionDate. WARNING if post-hoc.

UI: Upload/paste ExtractionObject JSON → run validators → display results with color-coded flags (green/amber/red). Show verdict (PASS/WARN/FAIL/CRITICAL) and cleared_for_synthesis boolean.

Levenshtein similarity function (needed for validators 7 and 9):
```javascript
function levenshteinSimilarity(a, b) {
  a = (a || '').toLowerCase().trim();
  b = (b || '').toLowerCase().trim();
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i-1][j] + 1, matrix[i][j-1] + 1, matrix[i-1][j-1] + cost);
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return 1 - matrix[a.length][b.length] / maxLen;
}
```

TruthCert output shape:
```javascript
function runTruthCert(extraction, existingPool = []) {
  const allFlags = [];
  const validators = [
    armSwapDetector, timepointDrift, unitChecker, totalChecker,
    eventRatePlausibility, zeroCellHandler, duplicateDetector,
    multiarmAdjuster, outcomeSwitchingDetector, registrationTiming
  ];
  for (const validator of validators) {
    const flags = validator(extraction, existingPool);
    allFlags.push(...flags);
    if (flags.some(f => f.severity === 'CRITICAL')) break; // Halt on CRITICAL
  }
  const hasCritical = allFlags.some(f => f.severity === 'CRITICAL');
  const hasWarning = allFlags.some(f => f.severity === 'WARNING');
  return {
    nct: extraction.nct,
    verdict: hasCritical ? 'CRITICAL' : hasWarning ? 'WARN' : 'PASS',
    flags: allFlags,
    witness_count: 0,
    certified_at: new Date().toISOString(),
    cleared_for_synthesis: !hasCritical
  };
}
```

- [ ] **Step 2: Test TruthCert with COLCOT ExtractionObject**

Load the ExtractionObject from Phase 0.2 into TruthCert. Expected:
- ARM_SWAP: PASS (colchicine=EXPERIMENTAL, placebo=PLACEBO)
- TOTAL_CHECKER: PASS (N analyzed <= N enrolled)
- MULTIARM: PASS (2 arms only)
- No CRITICAL flags
- Verdict: PASS or WARN
- cleared_for_synthesis: true

- [ ] **Step 3: Test with synthetic bad data**

Create a test ExtractionObject with:
- Swapped arm labels (placebo as EXPERIMENTAL) → should flag CRITICAL
- Events > participants → should flag CRITICAL
- 3 arms → should flag WARNING for multiarm

- [ ] **Step 4: Commit**

```bash
cd C:/cardiosynth
git add core/truthcert.html
git commit -m "Phase 0.3 complete: TruthCert 10-validator suite — COLCOT passes"
```

---

### Task 5: Provenance Store (Phase 0.3b)

**Files:**
- Create: `C:/cardiosynth/core/provenance-store.html`

- [ ] **Step 1: Create provenance-store.html**

Stores and retrieves provenance records. All data in localStorage.

Key functions:
```javascript
// Store a provenance record
function storeProvenance(record) {
  const key = `cardiosynth_prov_${record.nct}_${record.extraction_timestamp}`;
  const chain = getProvenanceChain(record.nct);
  chain.push({
    ...record,
    chain_index: chain.length,
    stored_at: new Date().toISOString()
  });
  localStorage.setItem(`cardiosynth_prov_chain_${record.nct}`, JSON.stringify(chain));
  localStorage.setItem(key, JSON.stringify(record));
  return key;
}

// Get full provenance chain for an NCT
function getProvenanceChain(nct) {
  const raw = localStorage.getItem(`cardiosynth_prov_chain_${nct}`);
  return raw ? JSON.parse(raw) : [];
}

// Generate SHA-256 hash of any object (for reproducibility anchor)
async function sha256(obj) {
  const text = JSON.stringify(obj, null, 0);
  const buffer = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

UI: View all stored provenance records, search by NCT, display chain of custody timeline, export full audit trail as JSON.

- [ ] **Step 2: Test store/retrieve cycle**

- [ ] **Step 3: Commit**

```bash
cd C:/cardiosynth
git add core/provenance-store.html
git commit -m "Phase 0.3b complete: provenance store with chain of custody"
```

---

### Task 6: Two-Agent Extraction Pipeline (Phase 0.4)

**Files:**
- Create: `C:/cardiosynth/core/disagreement-queue.html`

- [ ] **Step 1: Create disagreement-queue.html**

Implements the comparator and human arbitration interface.

Architecture:
- Accept two ExtractionObjects (A and B) for same NCT
- Compare field-by-field:
  - Numeric: flag if |A - B| / max(|A|, |B|) > 0.01 (>1% deviation). Use `??` for null safety.
  - String: flag if Levenshtein similarity < 0.95
  - Boolean: flag if different
- Display disagreements in a side-by-side diff view
- Human picks A, B, or edits merged value
- Output: merged ExtractionObject with witness_count = 2

```javascript
function compareExtractions(a, b) {
  const disagreements = [];

  function compareField(path, valA, valB) {
    if (valA === null && valB === null) return;
    if (typeof valA === 'number' && typeof valB === 'number') {
      const maxVal = Math.max(Math.abs(valA), Math.abs(valB));
      if (maxVal > 0 && Math.abs(valA - valB) / maxVal > 0.01) {
        disagreements.push({ path, valueA: valA, valueB: valB, type: 'numeric', deviation: Math.abs(valA - valB) / maxVal });
      }
    } else if (typeof valA === 'string' && typeof valB === 'string') {
      const sim = levenshteinSimilarity(valA, valB);
      if (sim < 0.95) {
        disagreements.push({ path, valueA: valA, valueB: valB, type: 'string', similarity: sim });
      }
    } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      if (valA !== valB) {
        disagreements.push({ path, valueA: valA, valueB: valB, type: 'boolean' });
      }
    }
  }

  // Compare all fields recursively
  function compareObj(objA, objB, prefix) {
    const allKeys = new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]);
    for (const key of allKeys) {
      if (key.startsWith('_')) continue; // Skip internal fields
      const path = prefix ? `${prefix}.${key}` : key;
      const vA = objA?.[key], vB = objB?.[key];
      if (typeof vA === 'object' && vA !== null && !Array.isArray(vA)) {
        compareObj(vA, vB, path);
      } else if (Array.isArray(vA)) {
        for (let i = 0; i < Math.max(vA?.length || 0, vB?.length || 0); i++) {
          if (typeof vA?.[i] === 'object') compareObj(vA?.[i], vB?.[i], `${path}[${i}]`);
          else compareField(`${path}[${i}]`, vA?.[i], vB?.[i]);
        }
      } else {
        compareField(path, vA, vB);
      }
    }
  }

  compareObj(a, b, '');
  return disagreements;
}
```

UI: Two-panel side-by-side view. Red highlights on disagreements. Accept A / Accept B / Edit buttons per field. Final "Merge & Certify" button that outputs merged ExtractionObject with witness_count=2.

- [ ] **Step 2: Test with identical extractions (expect 0 disagreements)**

- [ ] **Step 3: Test with synthetic disagreements**

- [ ] **Step 4: Commit**

```bash
cd C:/cardiosynth
git add core/disagreement-queue.html
git commit -m "Phase 0.4 complete: two-agent disagreement queue with merge UI"
```

---

### Task 7: MetaEngine Integration (Phase 0.5)

**Files:**
- Create: `C:/cardiosynth/core/metaengine.html`
- Source: Port from `C:/HTML apps/living-meta/src/lib/meta-dl.js`, `meta-fe.js`, `meta-cache.js`, `binary-methods.js`

This is the statistical core. Port all validated functions into a single HTML file.

- [ ] **Step 1: Create metaengine.html with full statistical engine**

Must contain (all inlined, no imports):

**Statistical utilities** (from meta-cache.js and meta-dl.js):
- `normalCDF(x)` — error function approximation
- `normalQuantile(p)` — rational approximation inverse normal CDF
- `tCDF(t, df)` — via incomplete beta
- `tQuantile(p, df)` — Newton-Raphson
- `tPDF(t, df)` — student's t density
- `chiSquareCDF(x, df)` — via regularized incomplete gamma
- `chiSquareQuantile(p, df)` — Newton-Raphson
- `gammaln(x)` — Lanczos approximation
- `gammainc(a, x)` — regularized incomplete gamma (series)
- `gammainc_upper(a, x)` — continued fraction
- `incompleteBeta(a, b, x)` — regularized
- `betacf(a, b, x)` — continued fraction for beta

**Core meta-analysis** (from meta-cache.js, meta-dl.js, meta-fe.js):
- `computeMAState(studies)` — single-pass FE+RE calculation
- `fixedEffects(studies)` — inverse-variance FE
- `derSimonianLaird(studies, options)` — DS-L RE with HKSJ
- `leaveOneOut(studies)` — LOO sensitivity (FE and RE)
- `cumulativeMeta(studies, orderBy)` — cumulative analysis
- `i2ConfidenceInterval(Q, k)` — I2 CI via Q distribution

**Binary methods** (from binary-methods.js):
- `escalcRR(ai, bi, ci, di)` — log risk ratio + variance
- `escalcRD(ai, bi, ci, di)` — risk difference + variance
- `escalcOR(ai, bi, ci, di)` — log odds ratio + variance
- `petoOddsRatio(studies)` — Peto's method for rare events
- `handleZeroCells(ai, bi, ci, di, cc)` — continuity correction (0.5 only if needed)

**Effect size calculators:**
```javascript
function escalcRR(ai, bi, ci, di, cc = 0) {
  // Apply continuity correction ONLY if any cell is zero
  if (cc > 0 && (ai === 0 || bi === 0 || ci === 0 || di === 0)) {
    ai += cc; bi += cc; ci += cc; di += cc;
  }
  const n1 = ai + bi, n2 = ci + di;
  const p1 = ai / n1, p2 = ci / n2;
  if (p1 === 0 && p2 === 0) return { yi: null, vi: null };
  if (p2 === 0) return { yi: null, vi: null }; // Undefined log(0)
  const yi = Math.log(p1 / p2); // log RR — ALWAYS pool on log scale
  const vi = (1/ai - 1/n1) + (1/ci - 1/n2);
  return { yi, vi };
}

function escalcRD(ai, bi, ci, di) {
  const n1 = ai + bi, n2 = ci + di;
  const p1 = ai / n1, p2 = ci / n2;
  const yi = p1 - p2;
  const vi = p1*(1-p1)/n1 + p2*(1-p2)/n2;
  return { yi, vi };
}
```

**Forest plot renderer** (SVG, inline, no library):
```javascript
function renderForestPlot(results, options = {}) {
  const { width = 900, rowHeight = 28, margin = { top: 40, right: 200, bottom: 60, left: 300 },
          logScale = true, title = 'Forest Plot', nullEffect = logScale ? 0 : 0 } = options;
  // ... SVG generation
  // Each row: study label | events/total | effect (95% CI) | weight% | forest bar
  // Summary diamond at bottom
  // Heterogeneity panel: I2, tau2, Q p-value
  // Color coding: PASS=black, WARN=amber, excluded=gray strikethrough
}
```

**MetaEngine integration function:**
```javascript
function runMetaAnalysis(certifiedExtractions, outcomeTitle, effectMeasure = 'auto') {
  // 1. Filter to cleared_for_synthesis = true
  // 2. Find matching outcome across extractions
  // 3. Extract 2x2 tables (ai, bi, ci, di) for binary; (mean, sd, n) for continuous
  // 4. Auto-select: COUNT → RR+RD, MEAN → MD
  // 5. Calculate effect sizes via escalc
  // 6. Run derSimonianLaird with HKSJ
  // 7. Run leaveOneOut, cumulativeMeta
  // 8. Return full results + SVG forest plot
}
```

- [ ] **Step 2: Validate DS-L against R metafor**

Use known test data. Create inline validation test:
```javascript
// BCG vaccine data (classic metafor example)
const bcgData = [
  { yi: -0.8893, vi: 0.3256 },  // Study 1
  { yi: -1.5854, vi: 0.1940 },  // Study 2
  // ... etc
];
const result = derSimonianLaird(bcgData, { hksj: true });
// Compare: theta, se, tau2, I2, ci_lower, ci_upper against metafor output
// Tolerance: |JS - R| < 0.0001
```

- [ ] **Step 3: Validate RR calculation against metafor::escalc(measure="RR")**

Test with known 2x2 table data.

- [ ] **Step 4: Test forest plot rendering**

Verify SVG output renders correctly with:
- Study labels with NCT numbers
- CI bars properly scaled
- Summary diamond
- Log scale axis for RR
- Heterogeneity panel

- [ ] **Step 5: Commit**

```bash
cd C:/cardiosynth
git add core/metaengine.html
git commit -m "Phase 0.5 complete: MetaEngine with DS-L/HKSJ — validated against R metafor"
```

---

### Task 8: Bias Quantification Layer (Phase 0.6)

**Files:**
- Create: `C:/cardiosynth/synthesis/bias-quantifier.html`

- [ ] **Step 1: Create bias-quantifier.html**

Two bias signals:

**1. Non-Posting Bias Estimator:**
```javascript
function estimateNonPostingBias(allStudies) {
  const completed = allStudies.filter(s => s.overallStatus === 'COMPLETED');
  const withResults = completed.filter(s => s.hasResults);
  const postingRate = withResults.length / completed.length;

  // Stratify by sponsor type
  const byType = {};
  for (const s of completed) {
    const type = s.leadSponsorClass || 'OTHER';
    if (!byType[type]) byType[type] = { total: 0, posted: 0 };
    byType[type].total++;
    if (s.hasResults) byType[type].posted++;
  }

  // Estimated direction: if industry posting > academic, assume positive bias
  const industryRate = byType['INDUSTRY']?.posted / byType['INDUSTRY']?.total || 0;
  const otherRate = byType['OTHER']?.posted / byType['OTHER']?.total || 0;
  const biasDirection = industryRate > otherRate ? 'positive' : 'unknown';

  return { postingRate, byType, biasDirection, nCompleted: completed.length, nPosted: withResults.length };
}
```

**2. Outcome Registration Bias Index (ORBI):**
```javascript
function calculateORBI(extractions) {
  let totalScore = 0;
  for (const ext of extractions) {
    // Compare registered primary outcome (from protocolSection) vs reported (resultsSection)
    const registered = ext.registered_primary_outcome || '';
    const reported = ext.outcomes.find(o => o.type === 'PRIMARY')?.title || '';
    const similarity = levenshteinSimilarity(registered, reported);
    totalScore += 1 - similarity; // 0 = perfect match, 1 = complete switch
  }
  return { meanORBI: totalScore / extractions.length, perStudy: /* ... */ };
}
```

UI: Display posting rate chart (bar chart by sponsor type), ORBI scores per study, funnel plot if n>=10, Egger's test.

**Funnel plot** (SVG):
- X axis: effect size (log RR)
- Y axis: standard error (inverted — smaller SE at top)
- Each study as a dot
- Triangular pseudo-95% CI region

**Egger's test:**
```javascript
function eggersTest(studies) {
  // Radial version: regress z_i / sqrt(vi) on 1/sqrt(vi)
  // Use Peters' test for binary outcomes
  const n = studies.length;
  if (n < 10) return { pValue: null, warning: 'Low power: k < 10' };
  const x = studies.map(s => 1 / Math.sqrt(s.vi)); // Precision
  const y = studies.map(s => s.yi / Math.sqrt(s.vi)); // Standardized effect
  // Simple linear regression
  const xMean = x.reduce((a, b) => a + b) / n;
  const yMean = y.reduce((a, b) => a + b) / n;
  let ssxy = 0, ssxx = 0, ssyy = 0;
  for (let i = 0; i < n; i++) {
    ssxy += (x[i] - xMean) * (y[i] - yMean);
    ssxx += (x[i] - xMean) ** 2;
    ssyy += (y[i] - yMean) ** 2;
  }
  const slope = ssxy / ssxx;
  const intercept = yMean - slope * xMean;
  const sResid = Math.sqrt((ssyy - slope * ssxy) / (n - 2));
  const seIntercept = sResid * Math.sqrt(1/n + xMean**2 / ssxx);
  const tStat = intercept / seIntercept;
  const pValue = 2 * (1 - tCDF(Math.abs(tStat), n - 2));
  return { intercept, slope, tStat, pValue, significant: pValue < 0.1 };
}
```

- [ ] **Step 2: Test with harvester data**

Load all colchicine/MI studies from harvester (both with and without results). Verify posting rate calculation.

- [ ] **Step 3: Commit**

```bash
cd C:/cardiosynth
git add synthesis/bias-quantifier.html
git commit -m "Phase 0.6 complete: bias quantifier — non-posting + ORBI + Egger's"
```

---

### Task 9: Living Update Engine (Phase 0.7)

**Files:**
- Modify: `C:/cardiosynth/harvesters/ct-harvester.html` (add update tracking)
- Create: `C:/cardiosynth/core/update-engine.js` (inline in colchicine-stemi.html)

- [ ] **Step 1: Add update tracking to harvester**

Add to ct-harvester.html:
```javascript
function checkForUpdates() {
  const lastQuery = localStorage.getItem('cardiosynth_last_query_timestamp');
  // Re-run same query
  // Compare results against previous snapshot
  // New results → flag for extraction → validate → integrate or queue
  // Return { newStudies: [], updatedStudies: [], removedStudies: [] }
}
```

- [ ] **Step 2: Add synthesis versioning**

```javascript
function saveSynthesisVersion(synthesisState) {
  const versions = JSON.parse(localStorage.getItem('cardiosynth_synthesis_versions') || '[]');
  const version = {
    version: `v${versions.length + 1}`,
    timestamp: new Date().toISOString(),
    k: synthesisState.k,
    pooledRR: synthesisState.theta,
    pooledCI: [synthesisState.ci_lower, synthesisState.ci_upper],
    I2: synthesisState.I2,
    tau2: synthesisState.tau2,
    studyIds: synthesisState.studies.map(s => s.nct)
  };
  versions.push(version);
  localStorage.setItem('cardiosynth_synthesis_versions', JSON.stringify(versions));
  return version;
}
```

- [ ] **Step 3: Commit**

```bash
cd C:/cardiosynth
git add harvesters/ct-harvester.html
git commit -m "Phase 0.7 complete: living update engine with synthesis versioning"
```

---

### Task 10: Colchicine STEMI Master Dashboard (Phase 0.8)

**Files:**
- Create: `C:/cardiosynth/phase0/colchicine-stemi.html`

This is the Phase 0 deliverable — the single HTML file that ties everything together.

- [ ] **Step 1: Create colchicine-stemi.html**

Must contain all inline code from Tasks 2-9 (statistical engine, validators, extractors, bias quantifier). This is the master file.

Sections (as per spec):
1. **Header** — Title, version, last updated, study count, TruthCert badge
2. **Evidence Map** — Sortable table of all included trials (NCT, Name, N, Year, Sponsor, Verdict, Weight). Click → full ExtractionObject + TruthCert report.
3. **Primary Synthesis** — MACE outcome. Forest plot (SVG), pooled RR with 95% CI and PI, heterogeneity stats, GRADE-equivalent confidence.
4. **Secondary Syntheses** — All-cause mortality, CV mortality, recurrent MI, hospitalisation, pericarditis, serious AEs.
5. **Cumulative Analysis Panel** — How pooled estimate evolved. Inflection points labelled.
6. **Bias Panel** — Non-posting rate, ORBI score, funnel plot (if k>=10), Egger's test.
7. **Provenance Bundle** — Download full audit trail JSON, SHA-256 hash, Zenodo button (placeholder).
8. **E156 Abstract** — Auto-generated 156-word, 7-sentence summary.

E156 auto-generator:
```javascript
function generateE156(synthesis) {
  const { k, theta, ci_lower, ci_upper, I2, tau2, pi_lower, pi_upper } = synthesis;
  const rr = Math.exp(theta).toFixed(2);
  const ciLo = Math.exp(ci_lower).toFixed(2);
  const ciHi = Math.exp(ci_upper).toFixed(2);

  const s1 = `Does colchicine reduce major adverse cardiovascular events after ST-elevation myocardial infarction?`;
  const s2 = `We synthesised ${k} randomised controlled trials from ClinicalTrials.gov structured results data, using dual-agent extraction with TruthCert validation.`;
  const s3 = `DerSimonian-Laird random-effects meta-analysis with Hartung-Knapp-Sidik-Jonkman correction was applied to log risk ratios, pooled on the log scale and back-transformed.`;
  const s4 = `The pooled risk ratio for MACE was ${rr} (95% CI ${ciLo}-${ciHi}; I\u00B2=${I2.toFixed(0)}%; ${k} trials).`;
  const s5 = `Leave-one-out analysis showed the estimate was robust to exclusion of any single trial; the prediction interval ${pi_lower !== null ? 'was ' + Math.exp(pi_lower).toFixed(2) + '-' + Math.exp(pi_upper).toFixed(2) : 'was undefined (k<3)'}.`;
  const s6 = `Colchicine ${rr < 1 ? 'appears to reduce' : 'does not appear to reduce'} MACE after STEMI, though the evidence base remains limited to ${k} trials.`;
  const s7 = `This living synthesis is limited to ClinicalTrials.gov structured results; unpublished endpoints and individual patient data are not included.`;

  return [s1, s2, s3, s4, s5, s6, s7].join(' ');
}
```

GRADE-equivalent auto-rating:
```javascript
function autoGRADE(synthesis, biasFlags) {
  let certainty = 4; // Start HIGH (RCTs)
  if (synthesis.I2 > 75) certainty -= 2; // Serious inconsistency
  else if (synthesis.I2 > 50) certainty -= 1;
  const criticalFlags = biasFlags.filter(f => f.severity === 'CRITICAL').length;
  if (criticalFlags > 0) certainty -= 2;
  const warnFlags = biasFlags.filter(f => f.severity === 'WARNING').length;
  if (warnFlags > 2) certainty -= 1;
  if (synthesis.k < 3) certainty -= 1; // Imprecision
  const totalN = synthesis.studies.reduce((sum, s) => sum + (s.n || 0), 0);
  if (totalN < 300) certainty -= 1;
  certainty = Math.max(1, Math.min(4, certainty));
  return ['VERY LOW', 'LOW', 'MODERATE', 'HIGH'][certainty - 1];
}
```

Styling: Professional medical dashboard. Dark header, clean white cards, medical blue accent (#1e40af). Responsive. Print-friendly.

- [ ] **Step 2: End-to-end test**

1. Open colchicine-stemi.html in Chrome
2. Click "Harvest from CT.gov" → verify studies load
3. Click "Extract All" → verify ExtractionObjects created
4. Verify TruthCert runs on each extraction
5. Verify forest plot renders with study labels
6. Verify cumulative analysis panel populates
7. Verify E156 abstract generates with word count <= 156
8. Click "Download Provenance" → verify JSON contains full audit trail
9. Verify SHA-256 hash displayed

- [ ] **Step 3: Verify COLCOT in synthesis**

NCT02551094 MUST appear in the forest plot. If missing, trace through harvest → extract → validate → synthesize pipeline.

- [ ] **Step 4: Commit**

```bash
cd C:/cardiosynth
git add phase0/colchicine-stemi.html
git commit -m "Phase 0.8 complete: colchicine-STEMI living synthesis dashboard"
```

---

### Task 11: Validation Report + Final Documentation

**Files:**
- Create: `C:/cardiosynth/docs/validation-report.md`
- Create: `C:/cardiosynth/docs/methodology.md`
- Update: `C:/cardiosynth/README.md`

- [ ] **Step 1: Write validation-report.md**

Document all statistical validations:
- DS-L tau2, theta, se — JS vs R metafor values + tolerance
- HKSJ correction — JS vs R values
- RR calculation — JS vs metafor::escalc("RR")
- Peto OR — JS vs metafor::rma.peto()
- I2 and Q — JS vs R values

- [ ] **Step 2: Write methodology.md**

Document the CardioSynth methodology:
- Data source (CT.gov API v2 only)
- Extraction process (dual-agent with TruthCert validation)
- Statistical methods (DS-L RE, HKSJ, binary effect sizes)
- Bias assessment (non-posting, ORBI, Egger's)
- Living update protocol

- [ ] **Step 3: Final commit**

```bash
cd C:/cardiosynth
git add docs/ README.md
git commit -m "Phase 0 complete: documentation and validation report"
```

---

### Task 12: Update INDEX.md + Workbook

**Files:**
- Modify: `C:/ProjectIndex/INDEX.md`
- Modify: `C:/E156/rewrite-workbook.txt`

- [ ] **Step 1: Add CardioSynth to INDEX.md**

Add entry with project status, test counts, lines of code, GitHub Pages URL.

- [ ] **Step 2: Add E156 entry to workbook**

Add CURRENT BODY (auto-generated E156 from dashboard), empty YOUR REWRITE, SUBMITTED: [ ].

- [ ] **Step 3: Commit index updates**

---

## Dependency Graph

```
Task 1 (scaffold)
  └─ Task 2 (harvester)
       └─ Task 3 (extractor)
            ├─ Task 4 (truthcert)
            │    └─ Task 5 (provenance)
            └─ Task 6 (disagreement queue)
                 └─ Task 7 (metaengine)
                      └─ Task 8 (bias quantifier)
                           └─ Task 9 (update engine)
                                └─ Task 10 (dashboard)
                                     └─ Task 11 (docs)
                                          └─ Task 12 (index)
```

All tasks are sequential. Each gates on the previous task's validation test passing.
