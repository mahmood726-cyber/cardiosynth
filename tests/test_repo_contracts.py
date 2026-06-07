"""Static artifact contracts for cardiosynth."""

from __future__ import annotations

import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
README = REPO_ROOT / "README.md"
VALIDATION_REPORT = REPO_ROOT / "docs" / "validation-report.md"
KEY_HTML_FILES = [
    REPO_ROOT / "harvesters" / "ct-harvester.html",
    REPO_ROOT / "harvesters" / "results-extractor.html",
    REPO_ROOT / "core" / "truthcert.html",
    REPO_ROOT / "core" / "provenance-store.html",
    REPO_ROOT / "core" / "disagreement-queue.html",
    REPO_ROOT / "core" / "metaengine.html",
    REPO_ROOT / "core" / "update-engine.html",
    REPO_ROOT / "synthesis" / "bias-quantifier.html",
    REPO_ROOT / "phase0" / "colchicine-stemi.html",
]
ASSET_RE = re.compile(r'<(?:link|script|img|a)[^>]+(?:href|src)="([^"]+)"', re.IGNORECASE)
ALL_HTML_FILES = sorted(REPO_ROOT.glob("**/*.html"))
# Externally-loaded assets (block offline use) — hyperlinks (<a href>) are allowed.
EXTERNAL_ASSET_RE = re.compile(
    r'<(?:link|script|img)[^>]+(?:href|src)="(https?://[^"]+)"', re.IGNORECASE
)
WINDOWS_PATH_RE = re.compile(r'[A-Za-z]:\\(?:Users|cardiosynth|Projects)', re.IGNORECASE)
PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}|REPLACE_ME|__PLACEHOLDER__|TODO_FILL")
ENGINE_HTML_FILES = [
    REPO_ROOT / "core" / "metaengine.html",
    REPO_ROOT / "phase0" / "colchicine-stemi.html",
]


def test_readme_claims_are_backed_by_repo_artifacts() -> None:
    readme = README.read_text(encoding="utf-8")

    assert "ClinicalTrials.gov structured results data" in readme
    assert "TruthCert fail-closed validation on every number" in readme
    assert "DerSimonian-Laird random effects (HKSJ-corrected)" in readme
    assert "docs/validation-report.md" in readme

    for html_file in KEY_HTML_FILES:
        assert html_file.is_file(), f"missing tool artifact: {html_file.relative_to(REPO_ROOT)}"


def test_validation_report_covers_core_methods() -> None:
    report = VALIDATION_REPORT.read_text(encoding="utf-8")

    assert "DerSimonian-Laird Random Effects" in report
    assert "HKSJ Correction" in report
    assert "TruthCert Validators" in report
    assert "MetaEngine Integration" in report
    assert "Bias Quantifier" in report


def test_phase0_dashboard_and_core_tools_expose_expected_markers() -> None:
    truthcert_html = (REPO_ROOT / "core" / "truthcert.html").read_text(encoding="utf-8")
    metaengine_html = (REPO_ROOT / "core" / "metaengine.html").read_text(encoding="utf-8")
    phase0_html = (REPO_ROOT / "phase0" / "colchicine-stemi.html").read_text(encoding="utf-8")

    assert "Run TruthCert" in truthcert_html
    assert "DerSimonian-Laird" in metaengine_html
    assert "HKSJ" in metaengine_html
    assert "Run Full Pipeline" in phase0_html
    assert "TruthCert PASS" in phase0_html or "TruthCert ALL PASS" in phase0_html
    assert "ClinicalTrials.gov" in phase0_html


def test_local_assets_resolve_for_key_html_files() -> None:
    missing: list[str] = []

    for html_file in KEY_HTML_FILES:
        html = html_file.read_text(encoding="utf-8")
        for target in ASSET_RE.findall(html):
            if target.startswith(("http://", "https://", "#", "mailto:")):
                continue
            if any(token in target for token in ("' +", '" +', "{", "}", "javascript:")):
                continue
            resolved = (html_file.parent / target).resolve()
            if not resolved.exists():
                missing.append(f"{html_file.relative_to(REPO_ROOT)}: {target}")

    assert not missing, f"missing linked assets: {missing}"


def test_no_externally_loaded_assets_offline() -> None:
    """Every HTML file must run offline: no CDN-loaded CSS/JS/fonts/images."""
    offenders: list[str] = []
    for html_file in ALL_HTML_FILES:
        html = html_file.read_text(encoding="utf-8")
        for hit in EXTERNAL_ASSET_RE.findall(html):
            offenders.append(f"{html_file.relative_to(REPO_ROOT)}: {hit}")
    assert not offenders, f"externally-loaded assets break offline use: {offenders}"


def test_no_hardcoded_local_paths() -> None:
    offenders: list[str] = []
    for html_file in ALL_HTML_FILES:
        html = html_file.read_text(encoding="utf-8")
        for hit in WINDOWS_PATH_RE.findall(html):
            offenders.append(f"{html_file.relative_to(REPO_ROOT)}: {hit}")
    assert not offenders, f"hardcoded local paths in shipped HTML: {offenders}"


def test_no_unfilled_placeholder_tokens() -> None:
    offenders: list[str] = []
    for html_file in ALL_HTML_FILES:
        html = html_file.read_text(encoding="utf-8")
        for hit in PLACEHOLDER_RE.findall(html):
            offenders.append(f"{html_file.relative_to(REPO_ROOT)}: {hit}")
    assert not offenders, f"unfilled placeholder tokens in shipped HTML: {offenders}"


def test_script_tags_balanced() -> None:
    """No literal </script> inside template literals / unmatched script tags."""
    imbalanced: list[str] = []
    for html_file in ALL_HTML_FILES:
        html = html_file.read_text(encoding="utf-8")
        opens = len(re.findall(r"<script[\s>]", html, re.IGNORECASE))
        closes = len(re.findall(r"</script>", html, re.IGNORECASE))
        if opens != closes:
            imbalanced.append(f"{html_file.relative_to(REPO_ROOT)}: {opens} open / {closes} close")
    assert not imbalanced, f"unbalanced <script> tags: {imbalanced}"


def test_prediction_interval_uses_tk1() -> None:
    """Regression guard: PI must use t_{k-1} (Cochrane v6.5), not the superseded t_{k-2}."""
    for html_file in ENGINE_HTML_FILES:
        html = html_file.read_text(encoding="utf-8")
        assert "k - 1" in html
        # No prediction-interval df should be computed as k-2.
        assert "tQuantile(0.975, k - 2)" not in html, f"{html_file.name}: stale t_{{k-2}} PI"
        assert "piDF = k - 2" not in html, f"{html_file.name}: stale t_{{k-2}} PI"


def test_validation_report_documents_tk1_prediction_interval() -> None:
    report = VALIDATION_REPORT.read_text(encoding="utf-8")
    assert "t_{k-1}" in report
    # If the superseded t_{k-2} is mentioned at all, it must be flagged as superseded.
    if "t_{k-2}" in report:
        assert "superseded" in report


def test_index_landing_page_links_resolve() -> None:
    """Root index.html (GitHub Pages landing) must link only to files that exist."""
    index = REPO_ROOT / "index.html"
    assert index.is_file(), "missing root index.html landing page"
    html = index.read_text(encoding="utf-8")
    missing: list[str] = []
    for target in re.findall(r'href="([^"]+)"', html):
        if target.startswith(("http://", "https://", "#", "mailto:")):
            continue
        if not (REPO_ROOT / target).exists():
            missing.append(target)
    assert not missing, f"broken landing-page links: {missing}"
