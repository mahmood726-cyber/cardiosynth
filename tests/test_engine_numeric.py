"""Numeric regression tests for the MetaEngine JS statistical engine.

These execute the actual JavaScript pooling functions from core/metaengine.html
under Node.js (headless), so numeric regressions in the statistical engine are
caught by `python -m pytest` rather than relying on the never-run in-page
self-test. Skips cleanly when Node is unavailable.

Locks in the fix for the I2/H2 heterogeneity defect: I2 and H2 must use the
Higgins-Thompson typical within-study variance (s2), which for DerSimonian-Laird
reduces exactly to I2=(Q-df)/Q and H2=Q/df -- NOT the RE pooled variance
(1/sum(w*)), which massively overstates heterogeneity.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
METAENGINE = REPO_ROOT / "core" / "metaengine.html"

# Balanced spread, all vi = 0.1 -> analytically Q=9.5, df=9.
DATASET = [
    {"yi": 0.30, "vi": 0.1},
    {"yi": -0.30, "vi": 0.1},
    {"yi": 0.35, "vi": 0.1},
    {"yi": -0.35, "vi": 0.1},
    {"yi": 0.40, "vi": 0.1},
    {"yi": -0.40, "vi": 0.1},
    {"yi": 0.25, "vi": 0.1},
    {"yi": -0.25, "vi": 0.1},
    {"yi": 0.20, "vi": 0.1},
    {"yi": -0.20, "vi": 0.1},
]

_HARNESS = """
const __DATA = %s;
const dl = derSimonianLaird(__DATA, {hksj:false});
const pm = pauleMandel(__DATA, {hksj:false});
const rm = reml(__DATA, {hksj:false});
console.log("@@RESULT@@" + JSON.stringify({
  Q: dl.Q, df: dl.df, tau2_dl: dl.tau2, I2_dl: dl.I2, H2_dl: dl.H2,
  tau2_pm: pm.tau2, I2_pm: pm.I2,
  tau2_reml: rm.tau2, I2_reml: rm.I2
}));
"""


def _run_engine(dataset: list[dict]) -> dict:
    node = shutil.which("node")
    if node is None:
        pytest.skip("node not available; JS engine numeric tests require Node.js")

    html = METAENGINE.read_text(encoding="utf-8")
    match = re.search(r"<script>([\s\S]*)</script>", html)
    assert match, "no <script> block found in metaengine.html"
    script = match.group(1) + (_HARNESS % json.dumps(dataset))

    with tempfile.NamedTemporaryFile(
        "w", suffix=".js", delete=False, encoding="utf-8"
    ) as fh:
        fh.write(script)
        tmp = Path(fh.name)
    try:
        proc = subprocess.run(
            [node, str(tmp)], capture_output=True, text=True, timeout=60
        )
    finally:
        tmp.unlink(missing_ok=True)

    assert proc.returncode == 0, f"node failed: {proc.stderr}"
    line = [ln for ln in proc.stdout.splitlines() if ln.startswith("@@RESULT@@")]
    assert line, f"no result marker in node output: {proc.stdout}\n{proc.stderr}"
    return json.loads(line[0][len("@@RESULT@@"):])


def _typical_within_variance(dataset: list[dict]) -> float:
    """Higgins-Thompson s2 from FE weights: (k-1)*sumW / (sumW^2 - sumW2)."""
    k = len(dataset)
    w = [1.0 / s["vi"] for s in dataset]
    sum_w = sum(w)
    sum_w2 = sum(x * x for x in w)
    return (k - 1) * sum_w / (sum_w * sum_w - sum_w2)


def test_dl_i2_h2_use_q_based_heterogeneity() -> None:
    """DL I2 must equal (Q-df)/Q and H2 must equal Q/df (metafor rma DL)."""
    r = _run_engine(DATASET)
    Q, df = r["Q"], r["df"]
    assert df == 9
    assert Q == pytest.approx(9.5, abs=1e-9)

    expected_i2 = (Q - df) / Q * 100.0
    expected_h2 = Q / df
    assert r["I2_dl"] == pytest.approx(expected_i2, abs=1e-6)
    assert r["H2_dl"] == pytest.approx(expected_h2, abs=1e-6)

    # Guard against the reverted bug: using the RE pooled variance
    # (1/sum(w*)) as the denominator inflates I2 to ~34.5% here.
    variance_re = 1.0 / sum(1.0 / (s["vi"] + r["tau2_dl"]) for s in DATASET)
    buggy_i2 = r["tau2_dl"] / (r["tau2_dl"] + variance_re) * 100.0
    assert buggy_i2 > 30.0  # confirm the two formulas are meaningfully distinct here
    assert abs(r["I2_dl"] - buggy_i2) > 20.0


def test_pm_and_reml_i2_use_typical_within_variance() -> None:
    """Paule-Mandel and REML I2 must use s2 (typical within-study variance)."""
    r = _run_engine(DATASET)
    s2 = _typical_within_variance(DATASET)

    for tau_key, i2_key in (("tau2_pm", "I2_pm"), ("tau2_reml", "I2_reml")):
        tau2 = r[tau_key]
        expected = tau2 / (tau2 + s2) * 100.0
        assert r[i2_key] == pytest.approx(expected, abs=1e-6), (
            f"{i2_key}={r[i2_key]} != expected {expected} (tau2={tau2}, s2={s2})"
        )
        # For this near-homogeneous-tau2 dataset the corrected I2 is ~5%,
        # while the reverted RE-pooled-variance bug gives ~34%.
        assert r[i2_key] < 15.0
