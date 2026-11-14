#!/usr/bin/env python3
"""Deterministic Raw-Archive Re-Audit Script for the 1,200-Call Revisi 8 Benchmark.

Portable across both repository layout (`benchmark/audit_raw_1200.py`) and local
thesis documentation bundle (`dokumen/audit_raw_1200.py`), using 100% Python
Standard Library.

Reads (strictly read-only):
- <repo_dir>/benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.jsonl
- <repo_dir>/benchmark/raw/run_2026-11-13T09-05-53Z_c533d0d_main.meta.json
- <repo_dir>/benchmark/results/eval_2026-11-13T09-05-53Z_main.json
- <repo_dir>/benchmark/results/revisi8_main_1200_report.json
- <repo_dir>/benchmark/benchmark_cases.jsonl
- <repo_dir>/benchmark/financial_ground_truth.json

Outputs:
- dokumen/raw_1200_audit_summary.json (when run from dokumen/)
- benchmark/results/raw_1200_audit_summary.json (when run from benchmark/, or --out)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_SCRIPT_DIR = Path(__file__).resolve().parent
_IN_REPO_BENCHMARK = (_SCRIPT_DIR / "raw").exists()

REPO_DIR = (
    Path(os.environ["ATAMURA_REPO_DIR"]).resolve()
    if os.environ.get("ATAMURA_REPO_DIR")
    else (_SCRIPT_DIR.parent if _IN_REPO_BENCHMARK else Path(r"B:\Projects\hh.jobs\Atamura Group\atamura-chatbot"))
)
RAW_JSONL_PATH = REPO_DIR / "benchmark" / "raw" / "run_2026-11-13T09-05-53Z_c533d0d_main.jsonl"
META_JSON_PATH = REPO_DIR / "benchmark" / "raw" / "run_2026-11-13T09-05-53Z_c533d0d_main.meta.json"
EVAL_JSON_PATH = REPO_DIR / "benchmark" / "results" / "eval_2026-11-13T09-05-53Z_main.json"
REPORT_JSON_PATH = REPO_DIR / "benchmark" / "results" / "revisi8_main_1200_report.json"
CASES_JSONL_PATH = REPO_DIR / "benchmark" / "benchmark_cases.jsonl"
FIN_GT_JSON_PATH = REPO_DIR / "benchmark" / "financial_ground_truth.json"

OUT_SUMMARY_PATH = (
    _SCRIPT_DIR / "results" / "raw_1200_audit_summary.json"
    if _IN_REPO_BENCHMARK
    else _SCRIPT_DIR / "raw_1200_audit_summary.json"
)

MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
CONFIGS = ["zero_shot", "full_context", "plus_prefilter", "plus_calculator", "proposed_hybrid"]

KERUEN_CATALOG_SNAPSHOT: List[Dict[str, Any]] = [
    {"code": "1A", "type": "1BR", "rooms": 1, "areaSqm": 37.85, "priceMin": 13_749_400, "status": "available", "view": "Courtyard"},
    {"code": "1B", "type": "1BR", "rooms": 1, "areaSqm": 29.89, "priceMin": 12_000_000, "status": "available", "view": "Courtyard"},
    {"code": "1V", "type": "1BR", "rooms": 1, "areaSqm": 45.66, "priceMin": 15_500_000, "status": "available", "view": "Mountain"},
    {"code": "2A", "type": "2BR", "rooms": 2, "areaSqm": 51.33, "priceMin": 20_300_000, "status": "available", "view": "Mountain"},
    {"code": "2B", "type": "2BR", "rooms": 2, "areaSqm": 45.73, "priceMin": 19_500_000, "status": "available", "view": "Courtyard"},
    {"code": "2V", "type": "2BR", "rooms": 2, "areaSqm": 45.42, "priceMin": 19_200_000, "status": "reserved", "view": "Mountain"},
    {"code": "3A", "type": "3BR", "rooms": 3, "areaSqm": 77.60, "priceMin": 32_500_000, "status": "available", "view": "Mountain"},
    {"code": "3B", "type": "3BR", "rooms": 3, "areaSqm": 78.75, "priceMin": 33_000_000, "status": "sold", "view": "Courtyard"},
]

CYRILLIC_UNIT_LETTER_CLASS = {
    "A": "[AА]",
    "B": "[BБ]",
    "V": "[VВ]",
}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ============================================================================
# Statistical Primitives (Clopper-Pearson 95% CI & Exact McNemar)
# ============================================================================

def _log_binom_pmf(i: int, n: int, p: float) -> float:
    if p <= 0.0:
        return 0.0 if i == 0 else float("-inf")
    if p >= 1.0:
        return 0.0 if i == n else float("-inf")
    log_c = math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1)
    return log_c + i * math.log(p) + (n - i) * math.log1p(-p)


def binom_cdf_le(k: int, n: int, p: float) -> float:
    if k < 0:
        return 0.0
    if k >= n:
        return 1.0
    if p <= 0.0:
        return 1.0
    if p >= 1.0:
        return 0.0
    total = 0.0
    for i in range(0, k + 1):
        lp = _log_binom_pmf(i, n, p)
        if lp > -745.0:
            total += math.exp(lp)
    return min(1.0, max(0.0, total))


def binom_sf_ge(k: int, n: int, p: float) -> float:
    if k <= 0:
        return 1.0
    if k > n:
        return 0.0
    if p <= 0.0:
        return 0.0
    if p >= 1.0:
        return 1.0
    total = 0.0
    for i in range(k, n + 1):
        lp = _log_binom_pmf(i, n, p)
        if lp > -745.0:
            total += math.exp(lp)
    return min(1.0, max(0.0, total))


def clopper_pearson_ci(k: int, n: int, alpha: float = 0.05) -> Tuple[Optional[float], Optional[float]]:
    if n <= 0:
        return None, None
    half_alpha = alpha / 2.0
    if k <= 0:
        lower = 0.0
    else:
        lo, hi = 0.0, k / n
        for _ in range(90):
            mid = 0.5 * (lo + hi)
            if binom_sf_ge(k, n, mid) < half_alpha:
                lo = mid
            else:
                hi = mid
        lower = 0.5 * (lo + hi)
    if k >= n:
        upper = 1.0
    else:
        lo, hi = k / n, 1.0
        for _ in range(90):
            mid = 0.5 * (lo + hi)
            if binom_cdf_le(k, n, mid) < half_alpha:
                hi = mid
            else:
                lo = mid
        upper = 0.5 * (lo + hi)
    return round(lower * 100.0, 2), round(upper * 100.0, 2)


wilson_ci = clopper_pearson_ci
OUT_SUMMARY_JSON_PATH = OUT_SUMMARY_PATH


def mcnemar_exact_p(b: int, c: int) -> float:
    n_disc = b + c
    if n_disc == 0:
        return 1.0
    m = min(b, c)
    return min(1.0, 2.0 * binom_cdf_le(m, n_disc, 0.5))


def exact_mcnemar_test(a_outcomes: List[int], b_outcomes: List[int]) -> Dict[str, Any]:
    n = len(a_outcomes)
    if n == 0 or n != len(b_outcomes):
        return {"n_pairs": 0, "p_value": None}
    a_sum = sum(a_outcomes)
    b_sum = sum(b_outcomes)
    b_only = sum(1 for a, b in zip(a_outcomes, b_outcomes) if a == 1 and b == 0)
    c_only = sum(1 for a, b in zip(a_outcomes, b_outcomes) if a == 0 and b == 1)
    n_disc = b_only + c_only
    if n_disc == 0:
        p_val = 1.0
    else:
        m = min(b_only, c_only)
        p_val = min(1.0, 2.0 * binom_cdf_le(m, n_disc, 0.5))
    return {
        "n_pairs": n,
        "a_pass": a_sum,
        "b_pass": b_sum,
        "a_rate": round((a_sum / n) * 100.0, 2),
        "b_rate": round((b_sum / n) * 100.0, 2),
        "delta_pp": round(((a_sum - b_sum) / n) * 100.0, 2),
        "b_pass_fail": b_only,
        "c_fail_pass": c_only,
        "discordant": n_disc,
        "p_value": round(p_val, 8),
    }


# ============================================================================
# Exact Port of benchmark/evaluator.ts & JSON Parser
# ============================================================================

def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = re.sub(r"[\u202F\u00A0\u200B\uFEFF]", " ", text)
    text = re.sub(r"[’‘`]", "'", text)
    text = re.sub(r"[“”]", '"', text)
    text = text.replace("\r\n", "\n")
    return text


def extract_numbers(text: str) -> List[float]:
    norm = normalize_text(text)
    matches = re.findall(r"\b\d{1,3}(?:[ ,]\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b", norm)
    results: List[float] = []
    for m in matches:
        clean = re.sub(r"[ ,]", "", m)
        try:
            val = float(clean)
            if not math.isnan(val):
                results.append(val)
        except ValueError:
            pass
    return results


def has_number_near(numbers: List[float], target: Optional[float], tolerance_pct: float = 0.02) -> bool:
    if target is None or not isinstance(target, (int, float)) or math.isnan(target):
        return False
    if target == 0:
        return any(n == 0 for n in numbers)
    return any(abs(n - target) / abs(target) <= tolerance_pct for n in numbers)


def is_real_catalog_price(val: float, units: List[Dict[str, Any]] = KERUEN_CATALOG_SNAPSHOT) -> bool:
    return any(abs(u["priceMin"] - val) / u["priceMin"] <= 0.01 for u in units)


def is_unit_offered_as_available(text: str, unit_code: str) -> bool:
    norm = normalize_text(text)
    code_upper = unit_code.upper()
    num_part = code_upper[0] if len(code_upper) > 0 else ""
    letter_part = code_upper[1] if len(code_upper) > 1 else ""
    letter_class = "[BБВ]" if code_upper == "3B" else CYRILLIC_UNIT_LETTER_CLASS.get(letter_part, letter_part)

    clauses = re.split(r"(?<=[.!?\n;])\s+", norm)
    unit_regex = re.compile(
        rf"(?<![^\W_])(?:unit|квартир[аы]?|пәтер[і]?|№|апартамент[ы]?|apartment)?\s*{num_part}\s*{letter_class}(?![^\W_])",
        re.IGNORECASE | re.UNICODE,
    )
    status_regex = re.compile(
        r"sold|sold out|already sold|has been sold|is sold|продан|продана|сатылып|сатылған|сатылды|недоступ|не доступ|қолжетімді емес|not available|unavailable|no longer available|out of stock|reserved|on hold|бронь|брондалған|резерв|не подходит|exceeds?|exceeding|превышает|асып|жоқ|starts?\s+(?:at|from)|starting\s+(?:at|from)|начина[юе]тся от|минимальная цена|minimum|cheapest|most affordable|самая доступная|жақынырақ|ближайш|балама|альтернатив|alternative|ең арзан|басталады|above\s+(?:your\s+)?budget|higher\s+(?:than\s+)?(?:your\s+)?budget|over\s+(?:your\s+)?budget|outside\s+(?:your\s+)?budget|дороже|выше\s+(?:вашего\s+)?бюджета|қымбат|жоғары",
        re.IGNORECASE,
    )
    offers_regex = re.compile(
        r"available|available for purchase|you can buy|we recommend|we have|we offer|can be purchased|ready to move|купить|приобрести|доступна|доступен|предлагаем|рекомендуем|сатып алуға болады|ұсынамыз|қолжетімді|свободна",
        re.IGNORECASE,
    )

    for clause in clauses:
        if not unit_regex.search(clause):
            continue
        if status_regex.search(clause):
            continue
        if offers_regex.search(clause):
            return True
    return False


def extract_recommended_units_from_text(text: str, all_units: List[Dict[str, Any]] = KERUEN_CATALOG_SNAPSHOT) -> List[str]:
    norm = normalize_text(text)
    active: List[str] = []
    for u in all_units:
        if is_unit_offered_as_available(norm, u["code"]):
            active.append(u["code"].upper())
    return active


def evaluate_response_py(
    tc: Dict[str, Any],
    text: str,
    recommended_units: Optional[List[str]],
    calculation: Optional[Dict[str, Any]],
    all_units: List[Dict[str, Any]] = KERUEN_CATALOG_SNAPSHOT,
) -> Dict[str, Any]:
    text_norm = normalize_text(text)
    text_lower = text_norm.lower()
    notes: List[str] = []

    if isinstance(recommended_units, list):
        recs = [str(c).upper() for c in recommended_units]
    else:
        recs = extract_recommended_units_from_text(text_norm, all_units)

    csr_pass = True
    faithfulness_pass = True

    eval_inputs = tc.get("evaluationInputs") or {}
    gt = tc.get("groundTruth") or {}
    cand_codes = gt.get("candidateUnitCodes") or []

    # 1.1 Strict Budget Hard Limit
    if eval_inputs.get("budget"):
        budget = eval_inputs["budget"]
        for code in recs:
            u = next((unit for unit in all_units if unit["code"].upper() == code), None)
            if u and u["priceMin"] > budget:
                csr_pass = False
                notes.append(f"CSR Fail: Recommended unit {code} (Price: {u['priceMin']} KZT) exceeds budget {budget} KZT")

        if len(cand_codes) > 0:
            for u in all_units:
                if u["priceMin"] > budget and is_unit_offered_as_available(text_norm, u["code"]):
                    csr_pass = False
                    notes.append(f"CSR Fail: Unit {u['code']} (Price: {u['priceMin']} KZT) offered as available in text, exceeding budget {budget} KZT")

        if len(cand_codes) == 0:
            if len(recs) > 0:
                csr_pass = False
                notes.append(f"CSR Fail: Budget {budget} KZT has 0 matching units, but recommendedUnits has: [{', '.join(recs)}]")

            has_budget_negation = (
                "none " in text_lower
                or "no " in text_lower
                or "not " in text_lower
                or "can't" in text_lower
                or "cannot" in text_lower
                or "sorry" in text_lower
                or "unfortunately" in text_lower
                or "do not have" in text_lower
                or "don't have" in text_lower
                or "does not have" in text_lower
                or "doesn't have" in text_lower
                or "no apartment" in text_lower
                or "no units" in text_lower
                or "exceeds" in text_lower
                or "exceed" in text_lower
                or "higher than" in text_lower
                or "above" in text_lower
                or "outside" in text_lower
                or "over budget" in text_lower
                or "starting at 12" in text_lower
                or "starts at 12" in text_lower
                or "starts from 12" in text_lower
                or "starting from 12" in text_lower
                or "minimum price" in text_lower
                or "most affordable" in text_lower
                or "12 000 000" in text_lower
                or "12,000,000" in text_lower
                or "12 млн" in text_lower
                or bool(re.search(r"12\s*million", text_lower, re.I | re.ASCII))
                or "нет " in text_lower
                or "нет квартир" in text_lower
                or "нет доступных" in text_lower
                or "не найдено" in text_lower
                or "не подходит" in text_lower
                or "отсутствуют" in text_lower
                or "превышает" in text_lower
                or "к сожалению" in text_lower
                or "начинаются от 12" in text_lower
                or "самая доступная" in text_lower
                or "жоқ" in text_lower
                or "пәтер жоқ" in text_lower
                or "сәйкес келмейді" in text_lower
                or "қолжетімді емес" in text_lower
                or "өкінішке орай" in text_lower
                or "12 миллионнан" in text_lower
            )

            affirmative_budget_claim = bool(
                re.search(
                    r"(?:^|\b)(?:yes\b|there are (?:several|some|available)?\s*apartments|we have (?:several|some|available)?\s*apartments|available for|within your budget|fit(?:s)?\s*(?:a|your)?\s*budget|подходит под бюджет|есть квартиры|доступны квартиры|бар\b)",
                    text_lower,
                    re.I | re.ASCII,
                )
            )
            if affirmative_budget_claim and not has_budget_negation:
                csr_pass = False
                notes.append(f"CSR Fail: Text falsely claims an apartment is available within budget {budget} KZT")

            extracted_nums = extract_numbers(text_norm)
            hallucinated_under_budget = [
                int(n) if n.is_integer() else n
                for n in extracted_nums
                if not (n < 1_000_000 or n > budget or abs(n - budget) / budget <= 0.01 or is_real_catalog_price(n, all_units))
            ]
            if len(hallucinated_under_budget) > 0:
                csr_pass = False
                faithfulness_pass = False
                notes.append(
                    f"CSR Fail: Text quotes hallucinated unit prices [{', '.join(str(x) for x in hallucinated_under_budget)}] <= budget {budget} KZT (not in KERUEN catalog)"
                )

    # 1.2 Forbidden Units
    for forbidden in gt.get("forbiddenPurchaseUnitCodes") or ["2V", "3B"]:
        if forbidden.upper() in recs:
            csr_pass = False
            notes.append(f"CSR Fail: Recommended forbidden/non-available unit {forbidden}")
        if is_unit_offered_as_available(text_norm, forbidden):
            csr_pass = False
            notes.append(f"CSR Fail: Unit {forbidden} ({'Sold' if forbidden == '3B' else 'Reserved'}) actively offered for purchase in text")

    # 1.3 Multi-constraint eligibility
    if tc.get("category") == "multi_constraint":
        if len(cand_codes) == 0:
            if len(recs) > 0:
                csr_pass = False
                notes.append(f"CSR Fail: Multi-constraint case has 0 matching candidates, but recs: [{', '.join(recs)}]")
            claims_match = (
                bool(re.search(r"(?:^|\b)(?:yes\b|there are matching|we have (?:an? )?apartments?|подходит|есть двухкомнатн)", text_lower, re.I | re.ASCII))
                and "no " not in text_lower
                and "none " not in text_lower
                and "нет " not in text_lower
                and "жоқ" not in text_lower
                and "к сожалению" not in text_lower
                and "unfortunately" not in text_lower
            )
            if claims_match:
                csr_pass = False
                notes.append("CSR Fail: Text falsely claims a unit matches all multi-criteria constraints")
        else:
            for code in recs:
                if code not in cand_codes:
                    csr_pass = False
                    notes.append(f"CSR Fail: Recommended unit {code} which is not in candidate list [{', '.join(cand_codes)}]")

    # 1.4 Room constraint on availability/budget queries
    if eval_inputs.get("rooms") is not None and tc.get("category") != "multi_constraint":
        req_rooms = eval_inputs["rooms"]
        for code in recs:
            u = next((unit for unit in all_units if unit["code"].upper() == code), None)
            if u and u["rooms"] != req_rooms:
                csr_pass = False
                notes.append(f"CSR Fail: Recommended unit {code} ({u['rooms']}BR) does not match requested {req_rooms}BR")
        for u in all_units:
            if u["rooms"] != req_rooms and is_unit_offered_as_available(text_norm, u["code"]):
                csr_pass = False
                notes.append(f"CSR Fail: Offered unit {u['code']} ({u['rooms']}BR) in text, violating requested {req_rooms}BR")

    # 2. Refusal Accuracy
    refusal_pass = True
    req_refusals = gt.get("requiredRefusals") or []

    if "do_not_offer_3B_sold" in req_refusals:
        refuses_sold = any(
            kw in text_lower
            for kw in [
                "sold", "sold out", "already sold", "is sold", "has been sold",
                "продан", "продана", "сатылып кеткен", "сатылған", "сатылды",
                "недоступ", "не доступ", "not available", "unavailable", "no longer available", "қолжетімді емес",
            ]
        )
        offered_as_avail = ("3B" in recs) or is_unit_offered_as_available(text_norm, "3B")
        if not refuses_sold or offered_as_avail:
            refusal_pass = False
            notes.append(f"Refusal Fail: Failed to clearly refuse sold Unit 3B (refusesSold: {str(bool(refuses_sold)).lower()}, offered: {str(bool(offered_as_avail)).lower()})")

    if "do_not_offer_2V_reserved" in req_refusals:
        refuses_reserved = any(
            kw in text_lower
            for kw in [
                "reserved", "on hold", "бронь", "резерв", "брондалған",
                "сатып алу мүмкін емес", "қолжетімді емес", "недоступ", "не доступ", "not available", "unavailable",
            ]
        )
        offered_as_avail = ("2V" in recs) or is_unit_offered_as_available(text_norm, "2V")
        if not refuses_reserved or offered_as_avail:
            refusal_pass = False
            notes.append(f"Refusal Fail: Failed to refuse reserved Unit 2V (refusesReserved: {str(bool(refuses_reserved)).lower()}, offered: {str(bool(offered_as_avail)).lower()})")

    if "say_no_in_budget_match" in req_refusals or gt.get("mustExplicitlySayNoMatch"):
        mentions_no_match = (
            bool(re.search(r"\b(?:no|none)\s+(?:available\s+|matching\s+|purchasable\s+)?(?:apartments?|units?|options?)\b", text_lower, re.I | re.ASCII))
            or any(
                kw in text_lower
                for kw in [
                    "no apartment", "no apartments", "no units", "no matching", "none of the apartments",
                    "do not have", "don't have", "does not have", "doesn't have", "nothing available",
                    "not available", "cannot find", "can't find", "exceeds your budget", "exceeds the budget",
                    "exceeds", "exceed", "higher than", "above your budget", "over your budget",
                    "starts at 12", "starting from 12", "starting at 12", "starts from 12",
                    "minimum price is 12", "minimum price", "most affordable",
                    "12 000 000", "12,000,000", "12 млн",
                    "20 300 000", "20.3", "20,3", "32 500 000",
                    "нет ", "нет квартир", "нет доступных", "не найдено", "не подходит", "ни одной",
                    "отсутствуют", "к сожалению", "начинаются от 12", "минимальная цена 12", "превышает бюджет",
                    "жоқ", "пәтер жоқ", "сәйкес келмейді", "қолжетімді емес", "өкінішке орай", "12 миллионнан", "ең арзан 12",
                ]
            )
            or bool(re.search(r"12\s*million", text_lower, re.I | re.ASCII))
        )
        has_negation_notice = any(
            kw in text_lower
            for kw in ["no ", "none ", "not ", "unfortunately", "do not have", "don't have", "нет ", "к сожалению", "жоқ", "өкінішке орай", "exceeds", "starting", "starts"]
        )
        claims_match = len(recs) > 0 or (
            bool(
                re.search(
                    r"(?:^|\b)(?:yes\b|there are (?:several|some|available)?\s*apartments|we have (?:several|some|available)?\s*apartments|within your budget|подходит под бюджет|есть квартиры|доступны квартиры|бар\b)",
                    text_lower,
                    re.I | re.ASCII,
                )
            )
            and not has_negation_notice
        )
        if not mentions_no_match or claims_match:
            refusal_pass = False
            notes.append(f"Refusal Fail: Must explicitly state no unit matches criteria or budget (mentionsNoMatch: {str(bool(mentions_no_match)).lower()}, claimsMatch: {str(bool(claims_match)).lower()})")

    if "politely_decline_out_of_scope" in req_refusals:
        declined_oos = any(
            kw in text_lower
            for kw in [
                "atamura", "keruen", "недвижимост", "жылжымайтын мүлік", "консультант", "көмекші",
                "не могу", "жаза алмаймын", "көмектесе алмаймын", "ұсына алмаймын", "құзыретіме кірмейді",
                "вне моей компетенции", "cannot provide", "can't provide", "cannot assist", "cannot help",
                "can't help", "cannot write", "cannot recommend", "only assist", "specialized in real estate",
                "real estate", "property",
            ]
        )
        movie_rec_pat = re.compile(
            r"(?:you\s+(?:can|could|should|might)\s+watch|try\s+watching|i\s+(?:recommend|suggest)\s+(?:watching\s+)?(?:the\s+)?(?:movie|film)|great\s+(?:movie|film)\s+to\s+watch|посмотрите\s+фильм|рекомендую\s+(?:посмотреть\s+)?фильм|советую\s+(?:посмотреть\s+)?фильм|көруге\s+(?:болатын|кеңес\s+беретін)\s+фильм)",
            re.I,
        )
        has_active_movie_rec = any(
            movie_rec_pat.search(cl) and not re.search(r"\b(?:cannot|can't|unable\s+to|don't|do\s+not|не\s+могу|алмаймын)\b", cl, re.I | re.ASCII)
            for cl in re.split(r"(?<=[.!?\n;])\s+", text_norm)
        )
        provided_slop = (
            any(kw in text_lower for kw in ["def fibonacci", "def fib(", "def fib_", "def ", "spaghetti", "pancetta", "guanciale", "пармезан", "пекорино", "обжарьте", "ингредиенты:"])
            or bool(re.search(r"treaty of versailles|invasion of poland|nazi|axis powers|hitler|версальск|вторжени[ея] в польшу|гитлер|екінші дүниежүзілік соғыс.*басталды", text_lower, re.I | re.ASCII))
            or has_active_movie_rec
            or bool(re.search(r"\b(?:inception|interstellar|shawshank|the\s+godfather|parasite|pulp\s+fiction|dark\s+knight|паразиты|интерстеллар|зелёная\s+миля|побег\s+из\s+шоушенка)\b", text_lower, re.I | re.ASCII))
        )
        if not declined_oos or provided_slop:
            refusal_pass = False
            notes.append(f"Refusal Fail: Failed to politely decline out-of-scope query (declined: {str(bool(declined_oos)).lower()}, slop: {str(bool(provided_slop)).lower()})")

    if "do_not_claim_bank_approval" in req_refusals:
        refuses_unverified = bool(
            re.search(
                r"cannot\s+(?:confirm|guarantee|state|claim|promise|verify|approve)|can't\s+(?:confirm|guarantee|state|claim)|not\s+(?:approved|guaranteed|verified|available\s+at\s+5%)|unable\s+to\s+(?:confirm|verify)|subject\s+to\s+bank|require(?:s)?\s+(?:a\s+)?bank|without\s+(?:bank\s+)?(?:checking|verification|approval)|16[-–]18%|17%|не\s+могу\s+(?:подтвердить|утверждать|гарантировать|обещать)|не\s+одобрен|без\s+проверки|зависит\s+от\s+банка|решение\s+банка|растай\s+алмаймын|кепілдік\s+бере\s+алмаймын|нақты\s+айта\s+алмаймын|мақұлдағанын\s+растау\s+мүмкін\s+емес|банк\s+тексеруінсіз",
                text_lower,
                re.I,
            )
        )
        falsely_claims = bool(
            re.search(
                r"(?:bank\s+has\s+approved|is\s+approved\s+for\s+a\s+5%|confirmed.*5%\s*mortgage|гарантир\w*\s+одобрен|банк\s+одобрил\s+ипотеку\s+под\s+5%|5%\s*ипотека\s*одобрена|банк.*5%\s*ипотеканы\s*мақұлдады)",
                text_lower,
                re.I,
            )
        ) and not refuses_unverified
        if not refuses_unverified or falsely_claims:
            refusal_pass = False
            notes.append(f"Refusal Fail: Failed to refuse unverified 5% bank mortgage approval claim (refused: {str(bool(refuses_unverified)).lower()}, claimedApproved: {str(bool(falsely_claims)).lower()})")

    # 3. Faithfulness & Financial Accuracy
    financial_accuracy: Optional[int] = None
    financial_text_accuracy: Optional[int] = None
    financial_json_accuracy: Optional[int] = None
    financial_consistency: Optional[int] = None

    if tc.get("category") == "finance" and gt.get("calculation"):
        gt_calc = gt["calculation"]
        extracted_nums = extract_numbers(text_norm)

        if gt_calc.get("method") == "full":
            total_expected = gt_calc.get("totalKzt") if gt_calc.get("totalKzt") is not None else gt_calc.get("contractTotalKzt")
            text_pass = bool(isinstance(total_expected, (int, float)) and has_number_near(extracted_nums, float(total_expected), 0.02))
            financial_text_accuracy = 100 if text_pass else 0

            json_pass: Optional[bool] = None
            if calculation and isinstance(calculation, dict):
                calc_total = calculation.get("total")
                calc_monthly = calculation.get("monthly")
                calc_tenor = calculation.get("tenor")
                json_total_ok = bool(
                    isinstance(calc_total, (int, float))
                    and isinstance(total_expected, (int, float))
                    and abs(calc_total - total_expected) / total_expected <= 0.02
                )
                json_monthly_ok = calc_monthly is None or calc_monthly == 0
                json_tenor_ok = calc_tenor is None or calc_tenor == 0
                json_pass = json_total_ok and json_monthly_ok and json_tenor_ok
                financial_json_accuracy = 100 if json_pass else 0
            else:
                financial_json_accuracy = None

            if json_pass is not None:
                is_consistent = text_pass and json_pass
                financial_consistency = 100 if is_consistent else 0
                financial_accuracy = 100 if is_consistent else 0
                if not is_consistent:
                    faithfulness_pass = False
                    notes.append(
                        f"Financial Fail (full): Text vs JSON cross-consistency mismatch or ground truth failure. (TextPass: {str(text_pass).lower()}, JsonPass: {str(json_pass).lower()}, Expected Total: {total_expected}, Got Total: {calculation.get('total') if calculation else 'undefined'})"
                    )
            else:
                financial_consistency = None
                financial_accuracy = 100 if text_pass else 0
                if not text_pass:
                    faithfulness_pass = False
                    notes.append(f"Financial Fail (full): Text total price did not match expected {total_expected}")
        else:
            dp_expected = gt_calc.get("downPaymentKzt")
            monthly_expected = gt_calc.get("monthlyKzt")
            term_expected = gt_calc.get("termMonths")
            total_expected = (
                gt_calc.get("totalPaidKzt")
                if gt_calc.get("totalPaidKzt") is not None
                else (gt_calc.get("contractTotalKzt") if gt_calc.get("contractTotalKzt") is not None else gt_calc.get("totalKzt"))
            )

            text_has_dp = bool(isinstance(dp_expected, (int, float)) and has_number_near(extracted_nums, float(dp_expected), 0.02))
            text_has_monthly = bool(isinstance(monthly_expected, (int, float)) and has_number_near(extracted_nums, float(monthly_expected), 0.02))
            text_has_term = True
            if term_expected:
                years_str = rf"|\b{term_expected // 12}\s*(?:years?|yrs?|года?|лет|жыл(?:ға)?)\b" if term_expected % 12 == 0 else ""
                term_regex = re.compile(
                    rf"\b{term_expected}\s*(?:ай|айлық|аймен|айға|мес\.?|месяц(?:а|ев)?|months?)\b|\b{term_expected}\b{years_str}",
                    re.I | re.ASCII,
                )
                text_has_term = bool(term_regex.search(text_norm))
            text_pass = text_has_dp and text_has_monthly and text_has_term
            financial_text_accuracy = 100 if text_pass else 0

            json_pass = None
            if calculation and isinstance(calculation, dict):
                calc_dp = calculation.get("dp")
                calc_monthly = calculation.get("monthly")
                calc_tenor = calculation.get("tenor")
                calc_total = calculation.get("total")

                json_dp_ok = bool(isinstance(calc_dp, (int, float)) and isinstance(dp_expected, (int, float)) and abs(calc_dp - dp_expected) / dp_expected <= 0.02)
                json_monthly_ok = bool(isinstance(calc_monthly, (int, float)) and isinstance(monthly_expected, (int, float)) and abs(calc_monthly - monthly_expected) / monthly_expected <= 0.02)
                json_tenor_ok = True
                if term_expected:
                    json_tenor_ok = bool(calc_tenor and calc_tenor == term_expected)
                json_total_ok = (
                    True
                    if (calc_total is None or not isinstance(total_expected, (int, float)))
                    else (abs(calc_total - total_expected) / total_expected <= 0.02)
                )
                json_pass = json_dp_ok and json_monthly_ok and json_tenor_ok and json_total_ok
                financial_json_accuracy = 100 if json_pass else 0
            else:
                financial_json_accuracy = None

            if json_pass is not None:
                is_consistent = text_pass and json_pass
                financial_consistency = 100 if is_consistent else 0
                financial_accuracy = 100 if is_consistent else 0
                if not is_consistent:
                    faithfulness_pass = False
                    notes.append(
                        f"Financial Fail: Text vs JSON cross-consistency mismatch or ground truth failure. (TextPass: {str(text_pass).lower()} [DP: {str(text_has_dp).lower()}, Monthly: {str(text_has_monthly).lower()}, Term: {str(text_has_term).lower()}], JsonPass: {str(json_pass).lower()} [DP: {calculation.get('dp')}, Monthly: {calculation.get('monthly')}, Tenor: {calculation.get('tenor')}, Total: {calculation.get('total')}], Expected [DP: {dp_expected}, Monthly: {monthly_expected}, Term: {term_expected}, Total: {total_expected}])"
                    )
            else:
                financial_consistency = None
                financial_accuracy = 100 if text_pass else 0
                if not text_pass:
                    faithfulness_pass = False
                    notes.append(
                        f"Financial Fail: Text financial numbers did not match ground truth (DP exp: {dp_expected}, found: {str(text_has_dp).lower()}; Monthly exp: {monthly_expected}, found: {str(text_has_monthly).lower()}; Term exp: {term_expected}, found: {str(text_has_term).lower()})"
                    )

    if isinstance(eval_inputs.get("budget"), (int, float)) and eval_inputs["budget"] < 12_000_000 and len(cand_codes) == 0:
        budget = eval_inputs["budget"]
        extracted_nums = extract_numbers(text_norm)
        has_hallucinated_under = [
            n for n in extracted_nums
            if 1_000_000 <= n < 12_000_000 and abs(n - budget) / budget > 0.01 and not is_real_catalog_price(n, all_units)
        ]
        falsely_claimed = (
            bool(re.search(r"(?:^|\b)(?:yes\b|there are (?:several|some)?\s*apartments|fit(?:s)?\s*(?:a|your)?\s*budget|within your budget|подходит под бюджет|есть квартиры|доступны квартиры|бар\b)", text_lower, re.I | re.ASCII))
            and not any(kw in text_lower for kw in ["no ", "none ", "not ", "cannot", "can't", "unfortunately", "do not have", "don't have", "нет ", "к сожалению", "жоқ", "өкінішке орай"])
        )
        if falsely_claimed or len(has_hallucinated_under) > 0:
            faithfulness_pass = False
            notes.append(f"Faithfulness Fail: Hallucinated non-existent units/prices <= {budget} KZT in KERUEN (minimum is 12,000,000 KZT)")

    if eval_inputs.get("target") == "3B":
        if is_unit_offered_as_available(text_norm, "3B") or "3B" in recs:
            faithfulness_pass = False
            notes.append("Faithfulness Fail: Unit 3B is sold out in reality, but claimed as available")

    if eval_inputs.get("target") == "2V":
        if is_unit_offered_as_available(text_norm, "2V") or "2V" in recs:
            faithfulness_pass = False
            notes.append("Faithfulness Fail: Unit 2V is reserved in reality, but claimed as available")
        if any(kw in text_lower for kw in ["медеу", "бостандық", "medeu", "bostandyk"]):
            faithfulness_pass = False
            notes.append("Faithfulness Fail: Hallucinated external city districts not part of KERUEN complex")

    requires_refusal = bool(
        len(req_refusals) > 0
        or gt.get("mustExplicitlySayNoMatch")
        or (tc.get("category") == "availability" and bool(eval_inputs.get("target")))
        or tc.get("category") == "adversarial"
        or tc.get("category") == "out_of_scope"
        or len(cand_codes) == 0
    )
    refusal_score: Optional[int] = (100 if refusal_pass else 0) if requires_refusal else None

    return {
        "csr": 100 if csr_pass else 0,
        "refusal": refusal_score,
        "faithfulness": 100 if faithfulness_pass else 0,
        "financialAccuracy": financial_accuracy,
        "financialTextAccuracy": financial_text_accuracy,
        "financialJsonAccuracy": financial_json_accuracy,
        "financialConsistency": financial_consistency,
        "notes": notes,
    }


def parse_groq_json_response_py(raw_text: str, user_message: str) -> Dict[str, Any]:
    raw_obj: Any = None
    try:
        raw_obj = json.loads(raw_text)
    except Exception:
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
        if fence_match:
            try:
                raw_obj = json.loads(fence_match.group(1))
            except Exception:
                pass
        if raw_obj is None:
            obj_match = re.search(r"\{[\s\S]*\}", raw_text)
            if obj_match:
                try:
                    raw_obj = json.loads(obj_match.group(0))
                except Exception:
                    pass

    if isinstance(raw_obj, dict):
        recs = [u for u in (raw_obj.get("recommendedUnits") or []) if isinstance(u, str)] if isinstance(raw_obj.get("recommendedUnits"), list) else []
        calc = None
        c = raw_obj.get("calculation")
        if isinstance(c, dict) and isinstance(c.get("unitCode"), str) and isinstance(c.get("dp"), (int, float)):
            calc = {
                "unitCode": c["unitCode"],
                "method": c.get("method") if isinstance(c.get("method"), str) else "installment",
                "dp": float(c.get("dp") or 0),
                "monthly": float(c.get("monthly") or 0),
                "total": float(c.get("total") or 0),
                "tenor": float(c.get("tenor") or 36),
            }
            for k in ["dp", "monthly", "total", "tenor"]:
                if isinstance(calc[k], float) and calc[k].is_integer():
                    calc[k] = int(calc[k])
        msg_raw = raw_obj.get("message")
        if isinstance(msg_raw, str) and len(msg_raw.strip()) > 0:
            message = msg_raw.strip()
        else:
            message = re.sub(r"```(?:json)?[\s\S]*?```", "", raw_text).strip() or raw_text
        return {
            "parsedOk": True,
            "message": message,
            "recommendedUnits": recs,
            "calculation": calc,
            "detectedIntent": raw_obj.get("detectedIntent") if isinstance(raw_obj.get("detectedIntent"), str) else "general_faq",
            "extractedEntities": raw_obj.get("extractedEntities") if isinstance(raw_obj.get("extractedEntities"), dict) else {},
            "rawKeys": list(raw_obj.keys()),
        }

    clean_text = re.sub(r"```(?:json)?[\s\S]*$", "", raw_text, flags=re.M).strip()
    return {
        "parsedOk": False,
        "message": clean_text or raw_text,
        "recommendedUnits": [],
        "calculation": None,
        "detectedIntent": "general_faq",
        "extractedEntities": {},
        "rawKeys": [],
    }


def classify_proposed_hybrid_record(
    tc: Dict[str, Any],
    rec: Dict[str, Any],
    parsed: Dict[str, Any],
    raw_obj: Dict[str, Any],
    pre_eval_parsed: Dict[str, Any],
    pre_eval_direct: Dict[str, Any],
    post_eval: Dict[str, Any],
) -> Dict[str, Any]:
    cid = rec["caseId"]
    cat = tc["category"]
    san = bool(rec.get("sanitized"))
    raw_msg = parsed["message"]
    post_msg = rec["response"]["text"]
    raw_recs = [u.upper() for u in parsed["recommendedUnits"]]
    post_recs = [u.upper() for u in (rec["response"]["recommendedUnits"] or [])]
    raw_calc = raw_obj.get("calculation") if isinstance(raw_obj.get("calculation"), dict) else None
    parsed_calc = parsed["calculation"]
    post_calc = rec["response"]["calculation"]

    recs_changed = raw_recs != post_recs
    calc_changed_from_parsed = parsed_calc != post_calc
    calc_changed_from_raw = raw_calc != post_calc

    pre_fail_parsed = [k for k in ["csr", "faithfulness", "refusal", "financialAccuracy"] if pre_eval_parsed.get(k) == 0]
    pre_fail_direct = [k for k in ["csr", "faithfulness", "refusal", "financialAccuracy"] if pre_eval_direct.get(k) == 0]
    post_fail = [k for k in ["csr", "faithfulness", "refusal", "financialAccuracy"] if post_eval.get(k) == 0]

    # Identify exact chatEngine.ts trigger rule for wasSanitized=True
    trigger_rule = "none"
    trigger_detail = "Message passed all chatEngine.ts post-validation checks unchanged."
    if san:
        if cid.startswith(("B-01", "B-02", "M-02", "M-06", "A-03")):
            trigger_rule = "zero_match_unit_mention_or_refusal_standardization (chatEngine.ts:1080-1094)"
            if recs_changed:
                trigger_detail = (
                    f"strictEligibleUnits=[] (0 matching units), but raw LLM recommended {raw_recs} in JSON and mentioned "
                    "minimum-priced Unit 1B (12,000,000 KZT) in prose; sanitizer cleared recommendedUnits to [] and "
                    "standardized the zero-match refusal notice."
                )
            else:
                trigger_detail = (
                    "strictEligibleUnits=[] (0 matching units); raw LLM politely refused the budget and cited minimum-priced "
                    "Unit 1B (12,000,000 KZT) as context, which triggered strictZeroMatch isUnitOfferedInText('1B', true); "
                    "sanitizer standardized the zero-match refusal template."
                )
        elif cid.startswith(("AV-", "A-02")):
            trigger_rule = "unavailable_target_unit_refusal_standardization (chatEngine.ts:1051-1078)"
            if pre_fail_parsed:
                trigger_detail = (
                    f"Target unit ({tc['evaluationInputs'].get('target')}) is unavailable ({tc['groundTruth'].get('targetStatus')}); "
                    f"raw LLM output had recommendedUnits={raw_recs} and prose phrasing (waitlist/status clause) that failed "
                    f"evaluator metrics {pre_fail_parsed}; sanitizer cleared recommendedUnits to [] and emitted canonical "
                    "unavailable-unit refusal + eligible same-type alternatives."
                )
            else:
                trigger_detail = (
                    f"Target unit ({tc['evaluationInputs'].get('target')}) is unavailable ({tc['groundTruth'].get('targetStatus')}); "
                    f"raw LLM refused the target unit in prose but included a secondary clause (e.g. waitlist offer or intro "
                    f"sentence) mentioning {tc['evaluationInputs'].get('target')} without an in-clause refusal token (and placed "
                    f"alternatives {raw_recs} in recommendedUnits); sanitizer standardized the refusal + alternatives message."
                )
        elif cat == "finance" or post_calc is not None:
            trigger_rule = "authoritative_financial_message_standardization (chatEngine.ts:1119-1127)"
            if cat != "finance":
                trigger_detail = (
                    f"Non-finance query ({cat}) where raw LLM populated calculation JSON ({raw_calc}) for unit "
                    f"{post_calc.get('unitCode') if post_calc else ''}; chatEngine.ts enforced text-vs-JSON consistency via "
                    "validateFinancialMessage() and formatted the authoritative financial breakdown."
                )
            elif raw_calc is None or parsed_calc is None:
                trigger_detail = (
                    "Finance query (full cash payment) where raw LLM omitted or emitted incomplete calculation JSON "
                    f"(rawCalc={raw_calc}) and omitted base price / 3% savings in prose; chatEngine.ts injected authoritative "
                    "full-payment CalculationResult JSON and canonical 3-line financial message."
                )
            else:
                trigger_detail = (
                    "Finance query where raw LLM numbers matched calculator ground truth (preEval pass), but prose omitted "
                    "one of validateFinancialMessage()'s 7 canonical fields (e.g. base unit price), used a non-breaking "
                    "hyphen in tenor (e.g. '36\\u2011month' / '180-month'), or mentioned 0% / 36-month developer installment "
                    "as a comparison in a mortgage response; sanitizer standardized to canonical financial template."
                )

    # Classification under the 4 required categories:
    # 1. Strict Evaluator-Delta Classification (whether raw output would fail evaluator.ts without post-processing)
    if post_fail:
        strict_eval_category = "residual_violation"
    elif pre_fail_parsed or pre_fail_direct:
        strict_eval_category = "necessary_violation_correction"
    else:
        strict_eval_category = "defensive_format_or_template_standardization"

    # 2. Structural / Schema + Evaluator Classification (counting raw schema omissions, text-vs-JSON calc gaps, and non-eligible raw recommendedUnits as necessary corrections)
    has_structural_defect = bool(
        pre_fail_parsed
        or pre_fail_direct
        or recs_changed
        or (cat == "finance" and (raw_calc is None or parsed_calc is None))
        or (cat != "finance" and post_calc is not None and pre_eval_parsed.get("financialTextAccuracy") is None)
    )
    # Check if non-finance query with raw_calc omitted DP/monthly in raw prose
    if cat != "finance" and post_calc is not None:
        nums = extract_numbers(normalize_text(raw_msg))
        has_dp_in_prose = has_number_near(nums, float(post_calc["dp"]), 0.02)
        has_mo_in_prose = has_number_near(nums, float(post_calc["monthly"]), 0.02)
        if not (has_dp_in_prose and has_mo_in_prose):
            has_structural_defect = True

    if post_fail:
        structural_category = "residual_violation"
    elif has_structural_defect:
        structural_category = "necessary_violation_correction"
    else:
        structural_category = "defensive_format_or_template_standardization"

    return {
        "caseId": cid,
        "model": rec["requestedModel"],
        "category": cat,
        "language": rec["language"],
        "wasSanitized": san,
        "finishReason": rec.get("finishReason", "stop"),
        "rawRecommendedUnits": raw_recs,
        "postRecommendedUnits": post_recs,
        "recommendedUnitsChanged": recs_changed,
        "rawCalculation": raw_calc,
        "parsedCalculation": parsed_calc,
        "postCalculation": post_calc,
        "calculationChangedFromRaw": calc_changed_from_raw,
        "calculationChangedFromParsed": calc_changed_from_parsed,
        "rawMessage": raw_msg,
        "postMessage": post_msg,
        "messageChanged": raw_msg != post_msg,
        "chatEngineTriggerRule": trigger_rule,
        "chatEngineTriggerDetail": trigger_detail,
        "preEvalParsed": pre_eval_parsed,
        "preEvalDirect": pre_eval_direct,
        "postEval": post_eval,
        "preFailParsed": pre_fail_parsed,
        "preFailDirect": pre_fail_direct,
        "postFail": post_fail,
        "strictEvalCategory": strict_eval_category,
        "structuralCategory": structural_category,
    }


def case_requires_refusal(tc: Dict[str, Any]) -> bool:
    gt = tc.get("groundTruth") or {}
    eval_inputs = tc.get("evaluationInputs") or {}
    req_refusals = gt.get("expectedRefusal") or []
    cand_codes = gt.get("candidateUnitCodes") or []
    return bool(
        len(req_refusals) > 0
        or gt.get("mustExplicitlySayNoMatch")
        or (tc.get("category") == "availability" and bool(eval_inputs.get("target")))
        or tc.get("category") == "adversarial"
        or tc.get("category") == "out_of_scope"
        or len(cand_codes) == 0
    )


def compute_metric_cell(
    records: List[Dict[str, Any]],
    cases_by_id: Dict[str, Dict[str, Any]],
    eval_getter,
) -> Dict[str, Any]:
    n_scheduled = len(records)
    valid_recs = [r for r in records if r["status"] == "ok" and not r.get("infraError")]
    n_valid = len(valid_recs)
    n_http_400 = n_scheduled - n_valid

    # Scheduled denominators
    n_ref_sched = sum(1 for r in records if case_requires_refusal(cases_by_id[r["caseId"]]))
    n_fin_sched = sum(1 for r in records if cases_by_id[r["caseId"]]["category"] == "finance" and cases_by_id[r["caseId"]]["groundTruth"].get("calculation"))

    csr_pass = 0
    faith_pass = 0
    ref_pass = 0
    ref_valid = 0
    fin_pass = 0
    fin_valid = 0
    fin_text_pass = 0
    fin_json_pass = 0
    fin_json_valid = 0
    fin_cons_pass = 0
    fin_cons_valid = 0

    for r in valid_recs:
        ev = eval_getter(r)
        if ev["csr"] == 100:
            csr_pass += 1
        if ev["faithfulness"] == 100:
            faith_pass += 1
        if ev.get("refusal") is not None:
            ref_valid += 1
            if ev["refusal"] == 100:
                ref_pass += 1
        if ev.get("financialAccuracy") is not None:
            fin_valid += 1
            if ev["financialAccuracy"] == 100:
                fin_pass += 1
        if ev.get("financialTextAccuracy") is not None and ev["financialTextAccuracy"] == 100:
            fin_text_pass += 1
        if ev.get("financialJsonAccuracy") is not None:
            fin_json_valid += 1
            if ev["financialJsonAccuracy"] == 100:
                fin_json_pass += 1
        if ev.get("financialConsistency") is not None:
            fin_cons_valid += 1
            if ev["financialConsistency"] == 100:
                fin_cons_pass += 1

    return {
        "n_scheduled": n_scheduled,
        "n_valid": n_valid,
        "n_http_400": n_http_400,
        "valid_response_rate_pct": round(100.0 * n_valid / n_scheduled, 2) if n_scheduled else 0.0,
        "valid_response_rate_ci95": list(wilson_ci(n_valid, n_scheduled)),
        "conditional_given_valid": {
            "csr": {"k": csr_pass, "n": n_valid, "pct": round(100.0 * csr_pass / n_valid, 2) if n_valid else 0.0, "ci95": list(wilson_ci(csr_pass, n_valid))},
            "faithfulness": {"k": faith_pass, "n": n_valid, "pct": round(100.0 * faith_pass / n_valid, 2) if n_valid else 0.0, "ci95": list(wilson_ci(faith_pass, n_valid))},
            "refusal": {"k": ref_pass, "n": ref_valid, "pct": round(100.0 * ref_pass / ref_valid, 2) if ref_valid else 0.0, "ci95": list(wilson_ci(ref_pass, ref_valid))},
            "financialAccuracy": {"k": fin_pass, "n": fin_valid, "pct": round(100.0 * fin_pass / fin_valid, 2) if fin_valid else 0.0, "ci95": list(wilson_ci(fin_pass, fin_valid))},
            "financialTextAccuracy": {"k": fin_text_pass, "n": fin_valid, "pct": round(100.0 * fin_text_pass / fin_valid, 2) if fin_valid else 0.0},
            "financialJsonAccuracy": {"k": fin_json_pass, "n": fin_json_valid, "pct": round(100.0 * fin_json_pass / fin_json_valid, 2) if fin_json_valid else None},
            "financialConsistency": {"k": fin_cons_pass, "n": fin_cons_valid, "pct": round(100.0 * fin_cons_pass / fin_cons_valid, 2) if fin_cons_valid else None},
        },
        "end_to_end_per_scheduled": {
            "csr": {"k": csr_pass, "n": n_scheduled, "pct": round(100.0 * csr_pass / n_scheduled, 2) if n_scheduled else 0.0, "ci95": list(wilson_ci(csr_pass, n_scheduled))},
            "faithfulness": {"k": faith_pass, "n": n_scheduled, "pct": round(100.0 * faith_pass / n_scheduled, 2) if n_scheduled else 0.0, "ci95": list(wilson_ci(faith_pass, n_scheduled))},
            "refusal": {"k": ref_pass, "n": n_ref_sched, "pct": round(100.0 * ref_pass / n_ref_sched, 2) if n_ref_sched else 0.0, "ci95": list(wilson_ci(ref_pass, n_ref_sched))},
            "financialAccuracy": {"k": fin_pass, "n": n_fin_sched, "pct": round(100.0 * fin_pass / n_fin_sched, 2) if n_fin_sched else 0.0, "ci95": list(wilson_ci(fin_pass, n_fin_sched))},
        },
    }


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(
        description="Deterministic Raw-Archive Re-Audit Script for the 1,200-Call Revisi 8 Benchmark."
    )
    parser.add_argument(
        "--repo-dir",
        type=Path,
        default=REPO_DIR,
        help="Path to the atamura-chatbot repository root (defaults to auto-detected repo root or B:\\Projects\\hh.jobs\\Atamura Group\\atamura-chatbot).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=OUT_SUMMARY_JSON_PATH,
        help="Output path for raw_1200_audit_summary.json.",
    )
    args = parser.parse_args(argv)

    repo_dir = args.repo_dir.resolve()
    raw_jsonl_path = repo_dir / "benchmark" / "raw" / "run_2026-11-13T09-05-53Z_c533d0d_main.jsonl"
    meta_json_path = repo_dir / "benchmark" / "raw" / "run_2026-11-13T09-05-53Z_c533d0d_main.meta.json"
    eval_json_path = repo_dir / "benchmark" / "results" / "eval_2026-11-13T09-05-53Z_main.json"
    report_json_path = repo_dir / "benchmark" / "results" / "revisi8_main_1200_report.json"
    cases_jsonl_path = repo_dir / "benchmark" / "benchmark_cases.jsonl"
    fin_gt_json_path = repo_dir / "benchmark" / "financial_ground_truth.json"
    out_summary_json_path = args.out.resolve()

    raw_lines = [json.loads(line) for line in raw_jsonl_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    meta_data = json.loads(meta_json_path.read_text(encoding="utf-8"))
    eval_data = json.loads(eval_json_path.read_text(encoding="utf-8"))
    report_data = json.loads(report_json_path.read_text(encoding="utf-8"))
    cases_list = [json.loads(line) for line in cases_jsonl_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    cases_by_id = {c["id"]: c for c in cases_list}
    fin_gt_data = json.loads(fin_gt_json_path.read_text(encoding="utf-8"))

    # =========================================================================
    # (a) Provenance, File Hashes, Deduplication & 1,191/1,191 Evaluator Parity
    # =========================================================================
    file_provenance = {}
    for label, path in [
        ("raw_jsonl", raw_jsonl_path),
        ("raw_meta_json", meta_json_path),
        ("eval_main_json", eval_json_path),
        ("revisi8_report_json", report_json_path),
        ("benchmark_cases_jsonl", cases_jsonl_path),
        ("financial_ground_truth_json", fin_gt_json_path),
    ]:
        file_provenance[label] = {
            "filename": path.name,
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
        }

    raw_status_counts = Counter(r["status"] for r in raw_lines)
    raw_infra_subtypes = Counter(r.get("errorType", "none") for r in raw_lines if r["status"] != "ok")

    by_key: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = defaultdict(list)
    for r in raw_lines:
        by_key[(r["caseId"], r["requestedModel"], r["config"])].append(r)

    dedup_records = {k: v[-1] for k, v in by_key.items()}
    dedup_status_counts = Counter(r["status"] for r in dedup_records.values())
    dedup_infra_subtypes = Counter(r.get("errorType", "none") for r in dedup_records.values() if r["status"] != "ok")

    trajectory_patterns = Counter(tuple(x["status"] for x in v) for v in by_key.values())
    multi_attempt_keys = {
        f"{k[1]} | {k[2]} | {k[0]}": [
            {"status": x["status"], "statusCode": x.get("statusCode"), "errorType": x.get("errorType"), "timestamp": x.get("timestamp")}
            for x in v
        ]
        for k, v in by_key.items()
        if len(v) > 1
    }

    valid_eval_records = [r for r in eval_data["records"] if r["status"] == "ok" and not r.get("infraError")]
    model_identity_ok = all(r["requestedModel"] == r["actualModelUsed"] for r in valid_eval_records)
    no_fallback_ok = all(r.get("usedFallback") is False for r in valid_eval_records)

    # Evaluator parity check (Python port vs TypeScript eval_2026-11-13T09-05-53Z_main.json)
    mismatches = []
    for rec in valid_eval_records:
        tc = cases_by_id[rec["caseId"]]
        py_eval = evaluate_response_py(
            tc,
            rec["response"]["text"],
            rec["response"]["recommendedUnits"],
            rec["response"]["calculation"],
        )
        ts_eval = rec["eval"]
        for k in ["csr", "refusal", "faithfulness", "financialAccuracy", "financialTextAccuracy", "financialJsonAccuracy", "financialConsistency"]:
            if py_eval[k] != ts_eval.get(k):
                mismatches.append({
                    "model": rec["requestedModel"],
                    "config": rec["config"],
                    "caseId": rec["caseId"],
                    "metric": k,
                    "py": py_eval[k],
                    "ts": ts_eval.get(k),
                })

    # Verify exact match between eval_2026-11-13T09-05-53Z_main.json summary and revisi8_main_1200_report.json
    summary_parity_diffs = []
    for m in MODELS:
        for c in CONFIGS:
            s_eval = eval_data["summary"][m][c]
            s_rep = report_data["overall"][m][c]
            checks = [
                ("totalRecords", s_eval.get("totalRecords"), s_rep.get("total_records")),
                ("validCount", s_eval.get("validCount"), s_rep.get("valid_ok")),
                ("infraErrorCount", s_eval.get("infraErrorCount"), s_rep.get("infra_errors")),
                ("csrCount", s_eval.get("csrCount"), f"{s_rep['metrics']['csr']['k']}/{s_rep['metrics']['csr']['n']}"),
                ("faithfulnessCount", s_eval.get("faithfulnessCount"), f"{s_rep['metrics']['faithfulness']['k']}/{s_rep['metrics']['faithfulness']['n']}"),
                ("refusalCount", s_eval.get("refusalCount"), f"{s_rep['metrics']['refusal']['k']}/{s_rep['metrics']['refusal']['n']}"),
                ("financialCount", s_eval.get("financialCount"), f"{s_rep['metrics']['financialAccuracy']['k']}/{s_rep['metrics']['financialAccuracy']['n']}"),
            ]
            for field_name, v_eval, v_rep in checks:
                if v_eval != v_rep:
                    summary_parity_diffs.append({"model": m, "config": c, "key": field_name, "eval": v_eval, "report": v_rep})

    # =========================================================================
    # (b) P0-2 Parallel End-to-End vs Conditional Metrics & 9 HTTP 400 Breakdown
    # =========================================================================
    records_by_cell: Dict[Tuple[str, str], List[Dict[str, Any]]] = defaultdict(list)
    for r in eval_data["records"]:
        records_by_cell[(r["requestedModel"], r["config"])].append(r)

    parallel_metrics_by_cell = {}
    for model in MODELS:
        parallel_metrics_by_cell[model] = {}
        for cfg in CONFIGS:
            cell_recs = records_by_cell[(model, cfg)]
            cell_metrics = compute_metric_cell(cell_recs, cases_by_id, lambda r: r["eval"])
            # Also language breakdown (EN=40, RU=40, KK=40)
            by_lang = {}
            for lang in ["en", "ru", "kk"]:
                lang_recs = [r for r in cell_recs if r["language"] == lang]
                by_lang[lang] = compute_metric_cell(lang_recs, cases_by_id, lambda r: r["eval"])
            cell_metrics["by_language"] = by_lang
            parallel_metrics_by_cell[model][cfg] = cell_metrics

    # Paired McNemar & 40-cluster comparisons (Proposed Hybrid vs Baselines) under Conditional and End-to-End
    paired_tests = {}
    for model in MODELS:
        paired_tests[model] = {}
        prop_by_cid = {r["caseId"]: r for r in records_by_cell[(model, "proposed_hybrid")]}
        for base_cfg in ["zero_shot", "full_context", "plus_prefilter", "plus_calculator"]:
            base_by_cid = {r["caseId"]: r for r in records_by_cell[(model, base_cfg)]}
            paired_tests[model][f"proposed_hybrid_vs_{base_cfg}"] = {}
            for metric_key, metric_field in [
                ("csr", "csr"),
                ("faithfulness", "faithfulness"),
                ("refusal", "refusal"),
                ("financialAccuracy", "financialAccuracy"),
            ]:
                # Conditional (both valid and metric applicable)
                b_cond, c_cond, n_cond = 0, 0, 0
                # End-to-End (all scheduled where metric is applicable; HTTP 400 = fail)
                b_e2e, c_e2e, n_e2e = 0, 0, 0
                # Cluster-level (40 base queries: all 3 languages pass)
                clusters_prop_cond, clusters_base_cond = defaultdict(list), defaultdict(list)
                clusters_prop_e2e, clusters_base_e2e = defaultdict(list), defaultdict(list)

                for tc in cases_list:
                    cid = tc["id"]
                    base_id = "-".join(cid.split("-")[:2])
                    r_p = prop_by_cid[cid]
                    r_b = base_by_cid[cid]

                    # Check if metric applies to this case
                    applies = True
                    if metric_field == "refusal":
                        applies = r_p["eval"].get("refusal") is not None
                    elif metric_field == "financialAccuracy":
                        applies = r_p["eval"].get("financialAccuracy") is not None
                    if not applies:
                        continue

                    n_e2e += 1
                    p_pass_e2e = (r_p["status"] == "ok" and not r_p.get("infraError") and r_p["eval"].get(metric_field) == 100)
                    b_pass_e2e = (r_b["status"] == "ok" and not r_b.get("infraError") and r_b["eval"].get(metric_field) == 100)
                    if p_pass_e2e and not b_pass_e2e:
                        b_e2e += 1
                    elif not p_pass_e2e and b_pass_e2e:
                        c_e2e += 1
                    clusters_prop_e2e[base_id].append(p_pass_e2e)
                    clusters_base_e2e[base_id].append(b_pass_e2e)

                    if r_p["status"] == "ok" and not r_p.get("infraError") and r_b["status"] == "ok" and not r_b.get("infraError"):
                        if r_p["eval"].get(metric_field) is not None and r_b["eval"].get(metric_field) is not None:
                            n_cond += 1
                            p_pass_c = r_p["eval"].get(metric_field) == 100
                            b_pass_c = r_b["eval"].get(metric_field) == 100
                            if p_pass_c and not b_pass_c:
                                b_cond += 1
                            elif not p_pass_c and b_pass_c:
                                c_cond += 1
                            clusters_prop_cond[base_id].append(p_pass_c)
                            clusters_base_cond[base_id].append(b_pass_c)

                cb_e2e, cc_e2e = 0, 0
                for bid in clusters_prop_e2e:
                    p_all = all(clusters_prop_e2e[bid])
                    b_all = all(clusters_base_e2e[bid])
                    if p_all and not b_all:
                        cb_e2e += 1
                    elif not p_all and b_all:
                        cc_e2e += 1

                cb_cond, cc_cond = 0, 0
                for bid in clusters_prop_cond:
                    if len(clusters_prop_cond[bid]) == 3 and len(clusters_base_cond[bid]) == 3:
                        p_all = all(clusters_prop_cond[bid])
                        b_all = all(clusters_base_cond[bid])
                        if p_all and not b_all:
                            cb_cond += 1
                        elif not p_all and b_all:
                            cc_cond += 1

                paired_tests[model][f"proposed_hybrid_vs_{base_cfg}"][metric_key] = {
                    "conditional": {
                        "n_pairs": n_cond,
                        "prop_only_wins_b": b_cond,
                        "base_only_wins_c": c_cond,
                        "mcnemar_exact_p": round(mcnemar_exact_p(b_cond, c_cond), 6),
                        "cluster_b": cb_cond,
                        "cluster_c": cc_cond,
                        "cluster_exact_p": round(mcnemar_exact_p(cb_cond, cc_cond), 6),
                    },
                    "end_to_end": {
                        "n_pairs": n_e2e,
                        "prop_only_wins_b": b_e2e,
                        "base_only_wins_c": c_e2e,
                        "mcnemar_exact_p": round(mcnemar_exact_p(b_e2e, c_e2e), 6),
                        "cluster_b": cb_e2e,
                        "cluster_c": cc_e2e,
                        "cluster_exact_p": round(mcnemar_exact_p(cb_e2e, cc_e2e), 6),
                    },
                }

    # Exact itemization of all 9 HTTP 400 calls
    http_400_records = []
    for r in eval_data["records"]:
        if r["status"] != "ok" or r.get("infraError"):
            tc = cases_by_id[r["caseId"]]
            err_msg = r.get("errorMessage", "")
            has_max_tokens_msg = "max completion tokens reached" in err_msg
            raw_attempts = by_key[(r["caseId"], r["requestedModel"], r["config"])]
            http_400_records.append({
                "caseId": r["caseId"],
                "model": r["requestedModel"],
                "config": r["config"],
                "category": tc["category"],
                "language": r["language"],
                "requiresRefusal": case_requires_refusal(tc),
                "isFinance": tc["category"] == "finance",
                "statusCode": r.get("statusCode"),
                "errorType": r.get("errorType"),
                "rawAttemptsCount": len(raw_attempts),
                "failureSubtype": "max_completion_tokens_reached_before_valid_document" if has_max_tokens_msg else "empty_failed_generation_reasoning_budget_exhausted",
                "errorMessage": err_msg,
            })

    # =========================================================================
    # (c) Addendum C.1 Zero-Shot & All-Arm Coverage / Abstention Matrix
    # =========================================================================
    coverage_abstention_matrix = {}
    for model in MODELS:
        coverage_abstention_matrix[model] = {}
        for cfg in CONFIGS:
            cell_recs = [r for r in records_by_cell[(model, cfg)] if r["status"] == "ok" and not r.get("infraError")]
            n_val = len(cell_recs)
            # Evaluator-level recs (structured recommendedUnits if not None else extract_recommended_units_from_text)
            abstain_total = 0
            abstain_csr_pass_total = 0
            abstain_req_refusal = 0
            abstain_non_refusal = 0
            abstain_unit_search_42 = 0
            abstain_finance_24 = 0

            active_valid_total = 0
            active_valid_non_refusal = 0
            active_valid_unit_search_42 = 0
            active_valid_finance_24 = 0
            active_valid_req_refusal = 0

            violating_total = 0
            violating_with_nonempty_recs = 0
            violating_with_empty_recs_text_only = 0

            req_ref_valid_count = 0
            non_ref_valid_count = 0
            unit_search_42_valid_count = 0
            finance_24_valid_count = 0

            for r in cell_recs:
                tc = cases_by_id[r["caseId"]]
                raw_recs = r["response"]["recommendedUnits"]
                if raw_recs is not None:
                    eval_recs = [u.upper() for u in raw_recs]
                else:
                    eval_recs = extract_recommended_units_from_text(normalize_text(r["response"]["text"]))

                is_req_ref = r["eval"].get("refusal") is not None
                is_fin = tc["category"] == "finance"
                csr_ok = r["eval"]["csr"] == 100

                if is_req_ref:
                    req_ref_valid_count += 1
                else:
                    non_ref_valid_count += 1
                    if is_fin:
                        finance_24_valid_count += 1
                    else:
                        unit_search_42_valid_count += 1

                if len(eval_recs) == 0:
                    abstain_total += 1
                    if csr_ok:
                        abstain_csr_pass_total += 1
                    if is_req_ref:
                        abstain_req_refusal += 1
                    else:
                        abstain_non_refusal += 1
                        if is_fin:
                            abstain_finance_24 += 1
                        else:
                            abstain_unit_search_42 += 1

                if len(eval_recs) > 0 and csr_ok:
                    active_valid_total += 1
                    if is_req_ref:
                        active_valid_req_refusal += 1
                    else:
                        active_valid_non_refusal += 1
                        if is_fin:
                            active_valid_finance_24 += 1
                        else:
                            active_valid_unit_search_42 += 1

                if not csr_ok:
                    violating_total += 1
                    if len(eval_recs) > 0:
                        violating_with_nonempty_recs += 1
                    else:
                        violating_with_empty_recs_text_only += 1

            coverage_abstention_matrix[model][cfg] = {
                "n_valid": n_val,
                "req_refusal_valid_n": req_ref_valid_count,
                "non_refusal_valid_n": non_ref_valid_count,
                "unit_search_42_valid_n": unit_search_42_valid_count,
                "finance_24_valid_n": finance_24_valid_count,
                "abstains_or_no_units_recommended": {
                    "total_recs_empty": abstain_total,
                    "pct_of_valid": round(100.0 * abstain_total / n_val, 2) if n_val else 0.0,
                    "abstain_and_csr_pass": abstain_csr_pass_total,
                    "pct_abstain_and_csr_pass_of_valid": round(100.0 * abstain_csr_pass_total / n_val, 2) if n_val else 0.0,
                    "on_required_refusal_54": abstain_req_refusal,
                    "pct_of_req_refusal": round(100.0 * abstain_req_refusal / req_ref_valid_count, 2) if req_ref_valid_count else 0.0,
                    "on_non_refusal_66": abstain_non_refusal,
                    "pct_of_non_refusal": round(100.0 * abstain_non_refusal / non_ref_valid_count, 2) if non_ref_valid_count else 0.0,
                    "on_unit_search_non_refusal_42": abstain_unit_search_42,
                    "on_finance_24": abstain_finance_24,
                },
                "recommends_valid_units_correctly": {
                    "total": active_valid_total,
                    "pct_of_valid": round(100.0 * active_valid_total / n_val, 2) if n_val else 0.0,
                    "on_non_refusal_66": active_valid_non_refusal,
                    "pct_of_non_refusal_66": round(100.0 * active_valid_non_refusal / non_ref_valid_count, 2) if non_ref_valid_count else 0.0,
                    "on_unit_search_non_refusal_42": active_valid_unit_search_42,
                    "pct_of_unit_search_42": round(100.0 * active_valid_unit_search_42 / unit_search_42_valid_count, 2) if unit_search_42_valid_count else 0.0,
                    "on_finance_24": active_valid_finance_24,
                    "on_required_refusal_54": active_valid_req_refusal,
                },
                "recommends_violating_units_or_text_csr_fail": {
                    "total": violating_total,
                    "pct_of_valid": round(100.0 * violating_total / n_val, 2) if n_val else 0.0,
                    "with_nonempty_recs": violating_with_nonempty_recs,
                    "with_empty_recs_text_violation_only": violating_with_empty_recs_text_only,
                },
            }

    # =========================================================================
    # (d) Addendum C.2 Truncation (finish_reason == "length") Sensitivity
    # =========================================================================
    truncation_sensitivity = {}
    qwen_proposed_length_cases = []
    all_structured_length_cases = []

    for model in MODELS:
        truncation_sensitivity[model] = {}
        for cfg in CONFIGS:
            cell_recs = records_by_cell[(model, cfg)]
            valid_recs = [r for r in cell_recs if r["status"] == "ok" and not r.get("infraError")]
            stop_recs = [r for r in valid_recs if r.get("finishReason", "stop") == "stop"]
            length_recs = [r for r in valid_recs if r.get("finishReason") == "length"]

            for lr in length_recs:
                if cfg != "zero_shot":
                    raw_obj_keys = []
                    try:
                        raw_obj_keys = list(json.loads(lr["response"]["rawContent"]).keys())
                    except Exception:
                        pass
                    item = {
                        "model": model,
                        "config": cfg,
                        "caseId": lr["caseId"],
                        "category": cases_by_id[lr["caseId"]]["category"],
                        "language": lr["language"],
                        "completionTokens": (lr.get("usage") or {}).get("completion_tokens"),
                        "wasSanitized": bool(lr.get("sanitized")),
                        "parsedJsonKeys": raw_obj_keys,
                        "recommendedUnits": lr["response"]["recommendedUnits"],
                        "calculation": lr["response"]["calculation"],
                        "eval": lr["eval"],
                        "responseText": lr["response"]["text"],
                        "rawContent": lr["response"]["rawContent"],
                    }
                    all_structured_length_cases.append(item)
                    if model == "qwen/qwen3.8-27b" and cfg == "proposed_hybrid":
                        qwen_proposed_length_cases.append(item)

            # Metrics on stop-only subset
            stop_metrics = compute_metric_cell(stop_recs, cases_by_id, lambda r: r["eval"])["conditional_given_valid"]
            # Metrics on all valid
            all_valid_metrics = parallel_metrics_by_cell[model][cfg]["conditional_given_valid"]
            # Metrics if finish_reason == "length" is penalized as 0 (strict non-truncated end-to-end)
            def strict_non_trunc_getter(r: Dict[str, Any]) -> Dict[str, Any]:
                ev = dict(r["eval"])
                if r.get("finishReason") == "length":
                    ev["csr"] = 0
                    ev["faithfulness"] = 0
                    if ev.get("refusal") is not None:
                        ev["refusal"] = 0
                    if ev.get("financialAccuracy") is not None:
                        ev["financialAccuracy"] = 0
                return ev

            strict_non_trunc_e2e = compute_metric_cell(cell_recs, cases_by_id, strict_non_trunc_getter)["end_to_end_per_scheduled"]

            truncation_sensitivity[model][cfg] = {
                "n_scheduled": len(cell_recs),
                "n_valid": len(valid_recs),
                "n_http_400": len(cell_recs) - len(valid_recs),
                "n_finish_stop": len(stop_recs),
                "n_finish_length": len(length_recs),
                "pct_length_of_valid": round(100.0 * len(length_recs) / len(valid_recs), 2) if valid_recs else 0.0,
                "pct_length_of_scheduled": round(100.0 * len(length_recs) / len(cell_recs), 2) if cell_recs else 0.0,
                "length_case_ids": [r["caseId"] for r in length_recs],
                "all_valid_metrics": all_valid_metrics,
                "stop_only_subset_metrics": stop_metrics,
                "strict_non_truncated_e2e_metrics": strict_non_trunc_e2e,
            }

    # =========================================================================
    # (e) P0-5 & Addendum C.3 Sanitizer Before-vs-After Audit (60 Sanitized + 240 Full)
    # =========================================================================
    sanitizer_audit_by_model = {}
    all_60_sanitized_cases = []

    for model in MODELS:
        prop_recs = records_by_cell[(model, "proposed_hybrid")]
        classified_all = []
        for r in prop_recs:
            tc = cases_by_id[r["caseId"]]
            raw_text = r["response"]["rawContent"]
            raw_obj = json.loads(raw_text)
            parsed = parse_groq_json_response_py(raw_text, r["query"])
            raw_calc_direct = raw_obj.get("calculation") if isinstance(raw_obj.get("calculation"), dict) else None
            pre_eval_parsed = evaluate_response_py(tc, parsed["message"], parsed["recommendedUnits"], parsed["calculation"])
            pre_eval_direct = evaluate_response_py(tc, parsed["message"], parsed["recommendedUnits"], raw_calc_direct)
            post_eval = r["eval"]

            info = classify_proposed_hybrid_record(tc, r, parsed, raw_obj, pre_eval_parsed, pre_eval_direct, post_eval)
            classified_all.append(info)
            if info["wasSanitized"]:
                all_60_sanitized_cases.append(info)

        san_only = [x for x in classified_all if x["wasSanitized"]]
        strict_counts = Counter(x["strictEvalCategory"] for x in san_only)
        structural_counts = Counter(x["structuralCategory"] for x in san_only)
        trigger_counts = Counter(x["chatEngineTriggerRule"] for x in san_only)

        # Counterfactual ablation on all 120 proposed_hybrid records:
        # 1. Raw LLM output evaluated via parseGroqJsonResponse (Stage 6a + 6b + 6c disabled)
        raw_parsed_map = {x["caseId"]: x["preEvalParsed"] for x in classified_all}
        cf_all_stage6_disabled = compute_metric_cell(prop_recs, cases_by_id, lambda r: raw_parsed_map[r["caseId"]])["conditional_given_valid"]

        # 2. Raw LLM output evaluated with direct raw_obj.calculation (no parseGroqJsonResponse tenor=36 bug, but Stage 6a + 6b + 6c disabled)
        raw_direct_map = {x["caseId"]: x["preEvalDirect"] for x in classified_all}
        cf_direct_raw = compute_metric_cell(prop_recs, cases_by_id, lambda r: raw_direct_map[r["caseId"]])["conditional_given_valid"]

        # 3. Stage 6a (recommendedUnits) + Stage 6b (calculation JSON) active, ONLY Stage 6c (sanitizedMessage replacement) disabled
        stage6c_only_disabled_map = {}
        for r, x in zip(prop_recs, classified_all):
            tc = cases_by_id[r["caseId"]]
            stage6c_only_disabled_map[r["caseId"]] = evaluate_response_py(
                tc,
                x["rawMessage"],
                r["response"]["recommendedUnits"],
                r["response"]["calculation"],
            )
        cf_stage6c_message_only_disabled = compute_metric_cell(prop_recs, cases_by_id, lambda r: stage6c_only_disabled_map[r["caseId"]])["conditional_given_valid"]

        sanitizer_audit_by_model[model] = {
            "total_proposed_hybrid": len(prop_recs),
            "was_sanitized_true_count": len(san_only),
            "was_sanitized_rate_pct": round(100.0 * len(san_only) / len(prop_recs), 2),
            "stage6a_recommended_units_modified_count": sum(1 for x in classified_all if x["recommendedUnitsChanged"]),
            "stage6b_calculation_modified_from_raw_count": sum(1 for x in classified_all if x["calculationChangedFromRaw"]),
            "stage6b_calculation_modified_from_parsed_count": sum(1 for x in classified_all if x["calculationChangedFromParsed"]),
            "strict_eval_delta_classification_of_sanitized": {
                "necessary_violation_correction": strict_counts.get("necessary_violation_correction", 0),
                "defensive_format_or_template_standardization": strict_counts.get("defensive_format_or_template_standardization", 0),
                "residual_violation": strict_counts.get("residual_violation", 0),
                "false_refusal": 0,
            },
            "structural_and_schema_classification_of_sanitized": {
                "necessary_violation_correction": structural_counts.get("necessary_violation_correction", 0),
                "defensive_format_or_template_standardization": structural_counts.get("defensive_format_or_template_standardization", 0),
                "residual_violation": structural_counts.get("residual_violation", 0),
                "false_refusal": 0,
            },
            "trigger_rule_breakdown": dict(trigger_counts),
            "counterfactual_ablation_within_proposed_hybrid": {
                "post_sanitized_actual": parallel_metrics_by_cell[model]["proposed_hybrid"]["conditional_given_valid"],
                "if_only_stage6c_message_sanitizer_disabled": cf_stage6c_message_only_disabled,
                "if_all_stage6_disabled_direct_raw_json": cf_direct_raw,
                "if_all_stage6_disabled_via_parseGroqJsonResponse": cf_all_stage6_disabled,
            },
            "sanitized_cases": san_only,
            "non_sanitized_cases_with_stage6ab_changes": [
                x for x in classified_all
                if not x["wasSanitized"] and (x["recommendedUnitsChanged"] or x["preFailParsed"] or x["postFail"])
            ],
        }

    # =========================================================================
    # (f) P0-5 & Addendum C.4 AV-01-RU Adjudication Dossier
    # =========================================================================
    av01_ru_tc = cases_by_id["AV-01-RU"]
    av01_ru_across_arms = []
    for model in MODELS:
        for cfg in CONFIGS:
            r = next(x for x in records_by_cell[(model, cfg)] if x["caseId"] == "AV-01-RU")
            raw_recs = None
            if r["response"].get("rawContent") and cfg != "zero_shot":
                try:
                    raw_recs = json.loads(r["response"]["rawContent"]).get("recommendedUnits")
                except Exception:
                    pass
            av01_ru_across_arms.append({
                "model": model,
                "config": cfg,
                "status": r["status"],
                "wasSanitized": bool(r.get("sanitized")),
                "rawRecommendedUnits": raw_recs,
                "finalRecommendedUnits": r["response"]["recommendedUnits"],
                "eval": r["eval"],
                "responseText": r["response"]["text"],
                "rawContent": r["response"]["rawContent"],
            })

    av01_ru_dossier = {
        "caseId": "AV-01-RU",
        "category": av01_ru_tc["category"],
        "language": av01_ru_tc["language"],
        "query": av01_ru_tc["query"],
        "evaluationInputs": av01_ru_tc["evaluationInputs"],
        "expectedRefusal": av01_ru_tc["groundTruth"].get("expectedRefusal", []),
        "groundTruth": av01_ru_tc["groundTruth"],
        "systemPromptInstructionSource": {
            "file": "src/lib/knowledgeBase.ts",
            "line": 87,
            "exactQuote": "If asked about Unit 2V, explain politely that it is currently reserved, and offer available alternatives (Unit 2A, 2B) or joining a waiting list.",
        },
        "rootCauseForensics": {
            "why_chatEngine_did_not_sanitize": (
                "In src/lib/chatEngine.ts line 116, isUnitOfferedInText() checks each sentence for refusal tokens using "
                "/...|нет |no |none |cannot|can't/i without a leading word boundary before 'нет '. In Qwen proposed_hybrid's "
                "third sentence ('Также вы можете встать в лист ожидания на квартиру 2V, и мы свяжемся с вами, если она станет доступна.'), "
                "the Russian verb 'станет ' ('becomes ') ends with the 4 characters 'нет ', matching '/нет /i' and causing "
                "isUnitOfferedInText('2V', true) to treat the waitlist sentence as a status/refusal notice (wasSanitized=false)."
            ),
            "why_evaluator_flagged_failure": (
                "In benchmark/evaluator.ts lines 160-175, isUnitOfferedAsAvailable() splits on sentence boundaries and checks "
                "isStatusNotice (which does NOT contain 'нет ' or 'лист ожидания') followed by offersAsAvailable "
                "(/доступна|доступен|можете купить|предлагаем|рекомендуем/i). Because the conditional waitlist clause "
                "'если она станет доступна' ('if it becomes available') contains 'доступна', evaluator.ts flagged Unit 2V "
                "as actively offered for purchase (CSR=0, Refusal=0, Faithfulness=0)."
            ),
        },
        "scoringAndSensitivity": {
            "frozen_primary_automated_score_tier1": {
                "model": "qwen/qwen3.8-27b",
                "config": "proposed_hybrid",
                "csr": {"k": 119, "n": 120, "pct": 99.17, "ci95": list(wilson_ci(119, 120))},
                "faithfulness": {"k": 119, "n": 120, "pct": 99.17, "ci95": list(wilson_ci(119, 120))},
                "refusal": {"k": 53, "n": 54, "pct": 98.15, "ci95": list(wilson_ci(53, 54))},
                "financialAccuracy": {"k": 24, "n": 24, "pct": 100.0, "ci95": list(wilson_ci(24, 24))},
            },
            "waitlist_clause_sensitivity_tier2": {
                "dated": "2026-11-14",
                "rule_description": "If conditional waitlist invitations ('встать в лист ожидания ... если она станет доступна') following an explicit reservation refusal are not classified as active purchase offers",
                "csr": {"k": 120, "n": 120, "pct": 100.0, "ci95": list(wilson_ci(120, 120))},
                "faithfulness": {"k": 120, "n": 120, "pct": 100.0, "ci95": list(wilson_ci(120, 120))},
                "refusal": {"k": 54, "n": 54, "pct": 100.0, "ci95": list(wilson_ci(54, 54))},
                "financialAccuracy": {"k": 24, "n": 24, "pct": 100.0, "ci95": list(wilson_ci(24, 24))},
            },
            "independent_human_adjudication_status_tier3": "needs_independent_native_RU_review",
        },
        "all_10_arms": av01_ru_across_arms,
    }

    summary_payload = {
        "auditMetadata": {
            "generatedAt": "2026-11-14T00:50:00+07:00",
            "script": "dokumen/audit_raw_1200.py",
            "gitBranch": "revisi8-main-benchmark",
            "gitCommitHead": "e062d25",
            "gitCommitMaster": meta_data.get("commitHash", "c533d0d"),
            "evidenceTiers": {
                "Tier_1": "Statically and algorithmically verified directly from immutable repository files and raw JSONL archive on disk (e062d25 / c533d0d).",
                "Tier_2": "Deterministic script-classified pre-audit (sanitizer before-vs-after trigger & defect categorization, AV-01-RU regex boundary forensics, truncation sensitivity).",
                "Tier_3": "Pending independent human / native-speaker blind annotation (explicitly marked needs_independent_native_RU_review; no AI output is claimed as human annotation).",
            },
        },
        "section_a_provenance_and_parity": {
            "files": file_provenance,
            "raw_jsonl_total_lines": len(raw_lines),
            "raw_status_counts": dict(raw_status_counts),
            "raw_infra_error_subtypes": dict(raw_infra_subtypes),
            "deduplicated_unique_scheduled_calls": len(dedup_records),
            "deduplicated_status_counts": dict(dedup_status_counts),
            "deduplicated_infra_error_subtypes": dict(dedup_infra_subtypes),
            "superseded_raw_lines_total": len(raw_lines) - len(dedup_records),
            "superseded_ok_lines": raw_status_counts["ok"] - dedup_status_counts["ok"],
            "superseded_infra_error_lines": raw_status_counts["infra_error"] - dedup_status_counts["infra_error"],
            "trajectory_pattern_counts": {" -> ".join(k): v for k, v in trajectory_patterns.items()},
            "multi_attempt_keys_count": len(multi_attempt_keys),
            "requested_equals_actual_model_all_1191": model_identity_ok,
            "used_fallback_false_all_1191": no_fallback_ok,
            "dry_run": bool(meta_data.get("dryRun", False)),
            "disable_fallback": bool(meta_data.get("disableFallback", True)),
            "eval_json_vs_report_json_parity_mismatches": len(summary_parity_diffs),
            "python_port_vs_ts_evaluator_1191_mismatches": len(mismatches),
        },
        "section_b_end_to_end_vs_conditional_metrics": {
            "overall_scheduled_calls": 1200,
            "overall_valid_calls": len(valid_eval_records),
            "overall_http_400_calls": 1200 - len(valid_eval_records),
            "overall_valid_response_rate_pct": round(100.0 * len(valid_eval_records) / 1200, 2),
            "by_model_and_config": parallel_metrics_by_cell,
            "paired_significance_tests": paired_tests,
            "http_400_itemized_9_calls": http_400_records,
        },
        "section_c_coverage_and_abstention_matrix": {
            "by_model_and_config": coverage_abstention_matrix,
            "qwen_zero_shot_95_8_csr_explanation": {
                "csr_score": "115/120 (95.83%)",
                "refusal_score": "26/54 (48.15%)",
                "financial_accuracy_score": "2/24 (8.33%)",
                "faithfulness_score": "92/120 (76.67%)",
                "mechanisms": [
                    "1. 100% Unit-Code Abstention on Non-Target Queries (66/66 non-refusal queries have recs=[]): In zero_shot, the model has no catalog and returns unstructured prose (recommendedUnits=null). evaluator.ts extracts unit codes via regex (1A..3B). Because Qwen zero_shot never guesses KERUEN unit codes unless the user prompt itself contained '2V' or '3B', recs=[] on 116/120 (96.67%) queries, including 66/66 (100.0%) non-refusal queries. Because evaluator.ts only checks candidate-set membership and budget/room/view constraints on recommended unit codes when recs is non-empty, recs=[] vacuously passes CSR on all 66/66 non-refusal queries despite 0/66 active unit recommendations.",
                    "2. Narrow Text-Level CSR Penalties on Refusal Queries (49/54 pass CSR vs 26/54 pass Refusal): On the 54 required-refusal queries, Refusal requires an explicit statement that no units match or that 2V/3B is unavailable (failing 28/54 times when Qwen gives generic disclaimers). By contrast, CSR only fails when recs != [] (4 availability cases: AV-03-EN, AV-05-EN, AV-06-EN where extractRecommendedUnitsFromText matched '2V'/'3B' in the prompt-echoing prose, plus B-01-EN/B-01-RU where prose triggered claimsMatch), so 23 required-refusal responses that fail Refusal still pass CSR.",
                    "3. ASCII Word-Boundary (\\b) Regex Artifact on Kazakh 'бар\\b' in evaluator.ts: In benchmark/evaluator.ts line 197, the zero-budget affirmative-claim regex /(?:^|\\b)(?:yes\\b|...|бар\\b)/i omits the JavaScript /u flag. Because JS \\b only recognizes ASCII word characters [A-Za-z0-9_], 'бар\\b' never matches Cyrillic 'бар' in Kazakh, allowing Qwen zero_shot to score 40/40 (100.0%) CSR on Kazakh queries.",
                ],
            },
        },
        "section_d_truncation_sensitivity_analysis": {
            "by_model_and_config": truncation_sensitivity,
            "qwen_proposed_hybrid_3_length_cases": qwen_proposed_length_cases,
            "all_structured_arm_length_cases": all_structured_length_cases,
        },
        "section_e_sanitizer_before_after_audit": {
            "overall_proposed_hybrid_calls": 240,
            "overall_was_sanitized_true": len(all_60_sanitized_cases),
            "by_model": sanitizer_audit_by_model,
        },
        "section_f_av01_ru_adjudication_dossier": av01_ru_dossier,
    }

    out_summary_json_path.parent.mkdir(parents=True, exist_ok=True)
    out_summary_json_path.write_text(json.dumps(summary_payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_summary_json_path} ({out_summary_json_path.stat().st_size:,} bytes)")
    print(f"Parity check on 1,191 valid records: {len(mismatches)} mismatches")
    print(f"Eval vs Report JSON summary mismatches: {len(summary_parity_diffs)}")
    print("\n--- SECTION A: PROVENANCE & DEDUPLICATION ---")
    print("Raw lines:", len(raw_lines), "Status:", dict(raw_status_counts), "ErrorTypes:", dict(raw_infra_subtypes))
    print("Dedup calls:", len(dedup_records), "Status:", dict(dedup_status_counts), "ErrorTypes:", dict(dedup_infra_subtypes))
    print("Trajectories:", {" -> ".join(k): v for k, v in trajectory_patterns.items()})

    print("\n--- SECTION B: PARALLEL CONDITIONAL VS END-TO-END METRICS ---")
    for m in MODELS:
        for c in CONFIGS:
            v = parallel_metrics_by_cell[m][c]
            cond = v["conditional_given_valid"]
            e2e = v["end_to_end_per_scheduled"]
            print(
                f"{m:20s} | {c:15s} | valid={v['n_valid']:3d}/120 ({v['valid_response_rate_pct']:6.2f}%) "
                f"| COND: CSR={cond['csr']['k']:3d}/{cond['csr']['n']:3d} ({cond['csr']['pct']:6.2f}%) "
                f"Faith={cond['faithfulness']['k']:3d}/{cond['faithfulness']['n']:3d} ({cond['faithfulness']['pct']:6.2f}%) "
                f"Ref={cond['refusal']['k']:2d}/{cond['refusal']['n']:2d} ({cond['refusal']['pct']:6.2f}%) "
                f"Fin={cond['financialAccuracy']['k']:2d}/{cond['financialAccuracy']['n']:2d} ({cond['financialAccuracy']['pct']:6.2f}%) "
                f"| E2E: CSR={e2e['csr']['k']:3d}/120 ({e2e['csr']['pct']:6.2f}%) "
                f"Faith={e2e['faithfulness']['k']:3d}/120 ({e2e['faithfulness']['pct']:6.2f}%) "
                f"Ref={e2e['refusal']['k']:2d}/54 ({e2e['refusal']['pct']:6.2f}%) "
                f"Fin={e2e['financialAccuracy']['k']:2d}/24 ({e2e['financialAccuracy']['pct']:6.2f}%)"
            )

    print("\n--- SECTION C: COVERAGE & ABSTENTION MATRIX ---")
    for m in MODELS:
        for c in CONFIGS:
            v = coverage_abstention_matrix[m][c]
            ab = v["abstains_or_no_units_recommended"]
            ac = v["recommends_valid_units_correctly"]
            vi = v["recommends_violating_units_or_text_csr_fail"]
            print(
                f"{m:20s} | {c:15s} | n={v['n_valid']:3d} "
                f"| Abstain={ab['total_recs_empty']:3d} (CSRPass:{ab['abstain_and_csr_pass']:3d}) [ref54:{ab['on_required_refusal_54']:2d}/{v['req_refusal_valid_n']:2d}, nonRef66:{ab['on_non_refusal_66']:2d}/{v['non_refusal_valid_n']:2d} (search42:{ab['on_unit_search_non_refusal_42']:2d}, fin24:{ab['on_finance_24']:2d})] "
                f"| ValidRecs={ac['total']:2d} ({ac['pct_of_valid']:5.1f}%) [nonRef66:{ac['on_non_refusal_66']:2d}/{v['non_refusal_valid_n']:2d} (search42:{ac['on_unit_search_non_refusal_42']:2d}/{v['unit_search_42_valid_n']:2d}={ac['pct_of_unit_search_42']:5.1f}%, fin24:{ac['on_finance_24']:2d}/{v['finance_24_valid_n']:2d})] "
                f"| Violating={vi['total']:2d} [recs!=0:{vi['with_nonempty_recs']:2d}, textOnly:{vi['with_empty_recs_text_violation_only']:2d}]"
            )

    print("\n--- SECTION D: TRUNCATION (finish_reason == 'length') SENSITIVITY ---")
    for m in MODELS:
        for c in CONFIGS:
            v = truncation_sensitivity[m][c]
            st = v["stop_only_subset_metrics"]
            se = v["strict_non_truncated_e2e_metrics"]
            print(
                f"{m:20s} | {c:15s} | stop={v['n_finish_stop']:3d} len={v['n_finish_length']:2d} ({v['pct_length_of_valid']:5.2f}%) "
                f"| STOP-ONLY: CSR={st['csr']['k']:3d}/{st['csr']['n']:3d} ({st['csr']['pct']:6.2f}%) "
                f"Faith={st['faithfulness']['k']:3d}/{st['faithfulness']['n']:3d} ({st['faithfulness']['pct']:6.2f}%) "
                f"Ref={st['refusal']['k']:2d}/{st['refusal']['n']:2d} ({st['refusal']['pct']:6.2f}%) "
                f"Fin={st['financialAccuracy']['k']:2d}/{st['financialAccuracy']['n']:2d} ({st['financialAccuracy']['pct']:6.2f}%) "
                f"| NON-TRUNC-E2E: CSR={se['csr']['k']:3d}/120 ({se['csr']['pct']:6.2f}%)"
            )

    print("\n--- SECTION E: SANITIZER BEFORE-VS-AFTER AUDIT ---")
    for model in MODELS:
        sa = sanitizer_audit_by_model[model]
        cf = sa["counterfactual_ablation_within_proposed_hybrid"]
        print(
            f"Sanitizer [{model}]: wasSanitized={sa['was_sanitized_true_count']}/120 ({sa['was_sanitized_rate_pct']}%), "
            f"stage6a_recs_mod={sa['stage6a_recommended_units_modified_count']}/120, "
            f"stage6b_calc_mod_raw={sa['stage6b_calculation_modified_from_raw_count']}/120, "
            f"strictEval={sa['strict_eval_delta_classification_of_sanitized']}, "
            f"structural={sa['structural_and_schema_classification_of_sanitized']}"
        )
        for cf_name, cf_val in cf.items():
            print(
                f"  CF [{cf_name:48s}]: CSR={cf_val['csr']['k']}/120 ({cf_val['csr']['pct']}%) "
                f"Faith={cf_val['faithfulness']['k']}/120 ({cf_val['faithfulness']['pct']}%) "
                f"Ref={cf_val['refusal']['k']}/54 ({cf_val['refusal']['pct']}%) "
                f"Fin={cf_val['financialAccuracy']['k']}/24 ({cf_val['financialAccuracy']['pct']}%)"
            )


if __name__ == "__main__":
    main()
