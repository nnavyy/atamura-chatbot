# Revisi 8 Controlled Benchmark Statistical Report

## 1. Provenance & Experimental Controls
- Input eval files: `eval_2026-11-13T01-26-06Z_pilot.json`
- Git commits: `ed722ef`
- Catalog SHA-256: `2699edf9aa6b584b38ce0b8790a333019acdc006ef150e762520da1d55a53b29`
- Evaluator SHA-256: `29885913b6e4f7ecd11628736f3220ba60f92f012787db8afd06290d376648e3`
- Hyperparameters: `{"temperature": 0.1, "max_tokens": 1024, "reasoning_effort": "default"}`
- Legacy config mapping: `naive_rag` -> `full_context` (Full-Context Prompting — static catalog/company context, no vector DB).

## 2. Overall Results (Accuracy Denominator Excludes Infra Errors)

| Model | Architecture | Valid / Total | Infra Err | CSR (95% Clopper-Pearson CI) | Faithfulness (95% CI) | Refusal (95% CI) | Financial Acc (95% CI) |
|---|---|---:|---:|---|---|---|---|
| `openai/gpt-oss-120b` | `zero_shot` | 12/12 | 0 | 75.0% (9/12, 95% CI [42.8, 94.5]) | 50.0% (6/12, 95% CI [21.1, 78.9]) | 0.0% (0/8, 95% CI [0.0, 36.9]) | 0.0% (0/2, 95% CI [0.0, 84.2]) |
| `openai/gpt-oss-120b` | `full_context` | 12/12 | 0 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (8/8, 95% CI [63.1, 100.0]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |
| `openai/gpt-oss-120b` | `plus_prefilter` | 12/12 | 0 | 91.7% (11/12, 95% CI [61.5, 99.8]) | 91.7% (11/12, 95% CI [61.5, 99.8]) | 87.5% (7/8, 95% CI [47.4, 99.7]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |
| `openai/gpt-oss-120b` | `plus_calculator` | 12/12 | 0 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (8/8, 95% CI [63.1, 100.0]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | 12/12 | 0 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (8/8, 95% CI [63.1, 100.0]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |
| `qwen/qwen3.8-27b` | `zero_shot` | 12/12 | 0 | 91.7% (11/12, 95% CI [61.5, 99.8]) | 66.7% (8/12, 95% CI [34.9, 90.1]) | 50.0% (4/8, 95% CI [15.7, 84.3]) | 0.0% (0/2, 95% CI [0.0, 84.2]) |
| `qwen/qwen3.8-27b` | `full_context` | 12/12 | 0 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (8/8, 95% CI [63.1, 100.0]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | 12/12 | 0 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (8/8, 95% CI [63.1, 100.0]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |
| `qwen/qwen3.8-27b` | `plus_calculator` | 12/12 | 0 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (8/8, 95% CI [63.1, 100.0]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | 12/12 | 0 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (8/8, 95% CI [63.1, 100.0]) | 100.0% (2/2, 95% CI [15.8, 100.0]) |

## 3. Financial Sub-Metrics, Latency, Tokens & Infra Breakdown

| Model | Architecture | Fin Text | Fin JSON | Fin Consistency | Sanitized | `length` Trunc | API Mean / P95 (ms) | Pipe Mean / P95 (ms) | Prompt / Compl (Reason) Tok | Est. Cost (USD) |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|
| `openai/gpt-oss-120b` | `zero_shot` | 0.0% (0/2) | N/A | N/A | 0 | 3 | 2031 / 2697 | 2031 / 2697 | 1585 / 8549 (2016) | $0.0054 |
| `openai/gpt-oss-120b` | `full_context` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 0 | 0 | 1998 / 4987 | 2002 / 4994 | 28765 / 5431 (3086) | $0.0076 |
| `openai/gpt-oss-120b` | `plus_prefilter` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 0 | 0 | 2119 / 9162 | 2133 / 9181 | 22344 / 5247 (3266) | $0.0065 |
| `openai/gpt-oss-120b` | `plus_calculator` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 0 | 0 | 1554 / 1800 | 1568 / 1822 | 23442 / 5151 (3089) | $0.0066 |
| `openai/gpt-oss-120b` | `proposed_hybrid` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 4 | 0 | 1684 / 2364 | 1733 / 2438 | 23442 / 5561 (3523) | $0.0069 |
| `qwen/qwen3.8-27b` | `zero_shot` | 0.0% (0/2) | N/A | N/A | 0 | 1 | 1357 / 2681 | 1357 / 2681 | 943 / 6124 (0) | $0.0253 |
| `qwen/qwen3.8-27b` | `full_context` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 0 | 0 | 1204 / 2010 | 1246 / 2011 | 30079 / 3897 (0) | $0.0397 |
| `qwen/qwen3.8-27b` | `plus_prefilter` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 0 | 0 | 1018 / 1759 | 1024 / 1760 | 22813 / 3571 (0) | $0.0325 |
| `qwen/qwen3.8-27b` | `plus_calculator` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 0 | 0 | 1082 / 1827 | 1086 / 1830 | 24215 / 3256 (0) | $0.0324 |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | 100.0% (2/2) | 100.0% (2/2) | 100.0% (2/2) | 2 | 0 | 1031 / 1539 | 1069 / 1567 | 24215 / 3573 (0) | $0.0337 |

## 4. Per-Language Breakdown (EN / RU / KK)

| Model | Architecture | Lang | Valid | CSR (95% CI) | Faithfulness | Refusal | Financial Acc |
|---|---|---|---:|---|---|---|---|
| `openai/gpt-oss-120b` | `zero_shot` | EN | 4/4 | 50.0% (2/4, 95% CI [6.8, 93.2]) | 50.0% (2/4) | 0.0% (0/3) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | RU | 4/4 | 75.0% (3/4, 95% CI [19.4, 99.4]) | 50.0% (2/4) | 0.0% (0/2) | 0.0% (0/1) |
| `openai/gpt-oss-120b` | `zero_shot` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 50.0% (2/4) | 0.0% (0/3) | 0.0% (0/1) |
| `openai/gpt-oss-120b` | `full_context` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `openai/gpt-oss-120b` | `full_context` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `openai/gpt-oss-120b` | `full_context` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | 100.0% (1/1) |
| `openai/gpt-oss-120b` | `plus_prefilter` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `openai/gpt-oss-120b` | `plus_prefilter` | KK | 4/4 | 75.0% (3/4, 95% CI [19.4, 99.4]) | 75.0% (3/4) | 66.7% (2/3) | 100.0% (1/1) |
| `openai/gpt-oss-120b` | `plus_calculator` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `openai/gpt-oss-120b` | `plus_calculator` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | 100.0% (1/1) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `zero_shot` | EN | 4/4 | 75.0% (3/4, 95% CI [19.4, 99.4]) | 75.0% (3/4) | 66.7% (2/3) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 75.0% (3/4) | 50.0% (1/2) | 0.0% (0/1) |
| `qwen/qwen3.8-27b` | `zero_shot` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 50.0% (2/4) | 33.3% (1/3) | 0.0% (0/1) |
| `qwen/qwen3.8-27b` | `full_context` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `full_context` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `plus_calculator` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `plus_calculator` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | EN | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | RU | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (2/2) | 100.0% (1/1) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | KK | 4/4 | 100.0% (4/4, 95% CI [39.8, 100.0]) | 100.0% (4/4) | 100.0% (3/3) | 100.0% (1/1) |

## 5. Per-Category Breakdown

| Model | Architecture | Category | Valid | CSR (95% CI) | Faithfulness | Refusal | Financial Acc |
|---|---|---|---:|---|---|---|---|
| `openai/gpt-oss-120b` | `zero_shot` | `budget` | 2/2 | 50.0% (1/2, 95% CI [1.3, 98.7]) | 50.0% (1/2) | 0.0% (0/1) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `availability` | 2/2 | 50.0% (1/2, 95% CI [1.3, 98.7]) | 0.0% (0/2) | 0.0% (0/2) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 0.0% (0/2) | N/A | 0.0% (0/2) |
| `openai/gpt-oss-120b` | `zero_shot` | `multi_constraint` | 2/2 | 50.0% (1/2, 95% CI [1.3, 98.7]) | 50.0% (1/2) | 0.0% (0/1) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 0.0% (0/2) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 0.0% (0/2) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `availability` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `openai/gpt-oss-120b` | `full_context` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `availability` | 2/2 | 50.0% (1/2, 95% CI [1.3, 98.7]) | 50.0% (1/2) | 50.0% (1/2) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `openai/gpt-oss-120b` | `plus_prefilter` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `availability` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `openai/gpt-oss-120b` | `plus_calculator` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `availability` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `availability` | 2/2 | 50.0% (1/2, 95% CI [1.3, 98.7]) | 0.0% (0/2) | 0.0% (0/2) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 0.0% (0/2) | N/A | 0.0% (0/2) |
| `qwen/qwen3.8-27b` | `zero_shot` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 0.0% (0/2) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `availability` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `qwen/qwen3.8-27b` | `full_context` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `availability` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `availability` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `qwen/qwen3.8-27b` | `plus_calculator` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `budget` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `availability` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `finance` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | N/A | 100.0% (2/2) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `multi_constraint` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (1/1) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `adversarial` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `out_of_scope` | 2/2 | 100.0% (2/2, 95% CI [15.8, 100.0]) | 100.0% (2/2) | 100.0% (2/2) | N/A |

## 6. Paired Hypothesis Tests (Exact McNemar & Cluster-Aware Inference)
> **Methodological Note (P0.5):** Each semantic scenario (`n=40`) is instantiated in 3 languages (`EN/RU/KK` -> `n=120` queries). Query-level McNemar reports discordant counts over all matched queries, while **Scenario-Cluster tests (`n=40` independent `semanticScenarioId` clusters)** eliminate intra-scenario language correlation via (a) strict all-languages-pass McNemar and (b) 10,000-resample cluster bootstrap 95% CI + paired sign-flip permutation p-value.

| Model / Pair | Metric | Query McNemar (`n`, b/c, delta, p) | Strict Cluster McNemar (`n_clust`, b/c, delta, p) | Cluster Mean Delta (95% Boot CI) & Perm p |
|---|---|---|---|---|
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `csr` | n=12, (3/0), +25.0 pp, p=0.2500 | n=12, (3/0), +25.0 pp, p=0.2500 | +25.0 pp [+0.0, +50.0], perm p=0.2500 |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `faithfulness` | n=12, (6/0), +50.0 pp, p=0.0313 | n=12, (6/0), +50.0 pp, p=0.0313 | +50.0 pp [+25.0, +75.0], perm p=0.0312 |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `refusal` | n=8, (8/0), +100.0 pp, p=0.0078 | n=8, (8/0), +100.0 pp, p=0.0078 | +100.0 pp [+100.0, +100.0], perm p=0.0078 |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `financialAccuracy` | n=2, (2/0), +100.0 pp, p=0.5000 | n=2, (2/0), +100.0 pp, p=0.5000 | +100.0 pp [+100.0, +100.0], perm p=0.5000 |
| [openai/gpt-oss-120b] full_context vs zero_shot | `csr` | n=12, (3/0), +25.0 pp, p=0.2500 | n=12, (3/0), +25.0 pp, p=0.2500 | +25.0 pp [+0.0, +50.0], perm p=0.2500 |
| [openai/gpt-oss-120b] full_context vs zero_shot | `faithfulness` | n=12, (6/0), +50.0 pp, p=0.0313 | n=12, (6/0), +50.0 pp, p=0.0313 | +50.0 pp [+25.0, +75.0], perm p=0.0312 |
| [openai/gpt-oss-120b] full_context vs zero_shot | `refusal` | n=8, (8/0), +100.0 pp, p=0.0078 | n=8, (8/0), +100.0 pp, p=0.0078 | +100.0 pp [+100.0, +100.0], perm p=0.0078 |
| [openai/gpt-oss-120b] full_context vs zero_shot | `financialAccuracy` | n=2, (2/0), +100.0 pp, p=0.5000 | n=2, (2/0), +100.0 pp, p=0.5000 | +100.0 pp [+100.0, +100.0], perm p=0.5000 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `csr` | n=12, (0/1), -8.3 pp, p=1.0000 | n=12, (0/1), -8.3 pp, p=1.0000 | -8.3 pp [-25.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `faithfulness` | n=12, (0/1), -8.3 pp, p=1.0000 | n=12, (0/1), -8.3 pp, p=1.0000 | -8.3 pp [-25.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `refusal` | n=8, (0/1), -12.5 pp, p=1.0000 | n=8, (0/1), -12.5 pp, p=1.0000 | -12.5 pp [-37.5, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `csr` | n=12, (1/0), +8.3 pp, p=1.0000 | n=12, (1/0), +8.3 pp, p=1.0000 | +8.3 pp [+0.0, +25.0], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `faithfulness` | n=12, (1/0), +8.3 pp, p=1.0000 | n=12, (1/0), +8.3 pp, p=1.0000 | +8.3 pp [+0.0, +25.0], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `refusal` | n=8, (1/0), +12.5 pp, p=1.0000 | n=8, (1/0), +12.5 pp, p=1.0000 | +12.5 pp [+0.0, +37.5], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `csr` | n=12, (1/0), +8.3 pp, p=1.0000 | n=12, (1/0), +8.3 pp, p=1.0000 | +8.3 pp [+0.0, +25.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `faithfulness` | n=12, (4/0), +33.3 pp, p=0.1250 | n=12, (4/0), +33.3 pp, p=0.1250 | +33.3 pp [+8.3, +58.3], perm p=0.1250 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `refusal` | n=8, (4/0), +50.0 pp, p=0.1250 | n=8, (4/0), +50.0 pp, p=0.1250 | +50.0 pp [+12.5, +87.5], perm p=0.1250 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `financialAccuracy` | n=2, (2/0), +100.0 pp, p=0.5000 | n=2, (2/0), +100.0 pp, p=0.5000 | +100.0 pp [+100.0, +100.0], perm p=0.5000 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `csr` | n=12, (1/0), +8.3 pp, p=1.0000 | n=12, (1/0), +8.3 pp, p=1.0000 | +8.3 pp [+0.0, +25.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `faithfulness` | n=12, (4/0), +33.3 pp, p=0.1250 | n=12, (4/0), +33.3 pp, p=0.1250 | +33.3 pp [+8.3, +58.3], perm p=0.1250 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `refusal` | n=8, (4/0), +50.0 pp, p=0.1250 | n=8, (4/0), +50.0 pp, p=0.1250 | +50.0 pp [+12.5, +87.5], perm p=0.1250 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `financialAccuracy` | n=2, (2/0), +100.0 pp, p=0.5000 | n=2, (2/0), +100.0 pp, p=0.5000 | +100.0 pp [+100.0, +100.0], perm p=0.5000 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=12, (0/2), -16.7 pp, p=0.5000 | n=12, (0/2), -16.7 pp, p=0.5000 | -16.7 pp [-41.7, +0.0], perm p=0.5000 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=12, (0/2), -16.7 pp, p=0.5000 | n=12, (0/2), -16.7 pp, p=0.5000 | -16.7 pp [-41.7, +0.0], perm p=0.5000 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=8, (0/4), -50.0 pp, p=0.1250 | n=8, (0/4), -50.0 pp, p=0.1250 | -50.0 pp [-87.5, -12.5], perm p=0.1250 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=12, (0/1), -8.3 pp, p=1.0000 | n=12, (0/1), -8.3 pp, p=1.0000 | -8.3 pp [-25.0, +0.0], perm p=1.0000 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=12, (0/1), -8.3 pp, p=1.0000 | n=12, (0/1), -8.3 pp, p=1.0000 | -8.3 pp [-25.0, +0.0], perm p=1.0000 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=8, (0/1), -12.5 pp, p=1.0000 | n=8, (0/1), -12.5 pp, p=1.0000 | -12.5 pp [-37.5, +0.0], perm p=1.0000 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=12, (0/0), +0.0 pp, p=1.0000 | n=12, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=8, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=2, (0/0), +0.0 pp, p=1.0000 | n=2, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
