# Atamura benchmark instrument pack — draft v1.0

**This package contains proposed test questions/ground truth and a written protocol, NOT generated empirical results. It does not call Gemini or NeonDB.**

Files:
- `benchmark_cases.jsonl` — 120 matched questions: 40 scenarios × 3 languages; each with expected eligible unit codes and reference finance if applicable.
- `pilot_12_cases.jsonl` — 12 stratified trial cases (balanced by category and language).
- `catalog_snapshot_seed.json` — independent frozen copy of 8 seeded records from `prisma/seed.ts`; **not a live database export**.
- `financial_parameters.json` — sources and assumptions; commercial offers not verified.
- `financial_ground_truth.json` — 8 independent financial calculation oracles.
- `benchmark_protocol_v1.md` — measurement and scoring plan.
- `validate_pack.py` — offline integrity and arithmetic cross-checks.
- `build_pack.py` — reproducible generation of the instrument pack, not a benchmark runner.

Run: `python validate_pack.py` (no dependencies).

WARNING: Some Kazakh/Russian phrasing is provisional AI-authored text and requires language QA. A single pilot is not a proof of validity. The public atamura.group/zk/keruen page currently indicates 9 layout variants and prices on request; reconcile the eight-code seed's provenance and study snapshot in the final manuscript.
