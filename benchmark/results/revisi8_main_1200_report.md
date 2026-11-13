# Revisi 8 Controlled Benchmark Statistical Report

## 1. Provenance & Experimental Controls
- Input eval files: `eval_2026-11-13T09-05-53Z_main.json`
- Git commits: `c533d0d`
- Catalog SHA-256: `2699edf9aa6b584b38ce0b8790a333019acdc006ef150e762520da1d55a53b29`
- Evaluator SHA-256: `29885913b6e4f7ecd11628736f3220ba60f92f012787db8afd06290d376648e3`
- Hyperparameters: `{"temperature": 0.1, "max_tokens": 1024, "reasoning_effort": "default"}`
- Legacy config mapping: `naive_rag` -> `full_context` (Full-Context Prompting — static catalog/company context, no vector DB).

## 2. Overall Results (Accuracy Denominator Excludes Infra Errors)

| Model | Architecture | Valid / Total | Infra Err | CSR (95% Clopper-Pearson CI) | Faithfulness (95% CI) | Refusal (95% CI) | Financial Acc (95% CI) |
|---|---|---:|---:|---|---|---|---|
| `openai/gpt-oss-120b` | `zero_shot` | 120/120 | 0 | 87.5% (105/120, 95% CI [80.2, 92.8]) | 67.5% (81/120, 95% CI [58.4, 75.8]) | 13.0% (7/54, 95% CI [5.4, 24.9]) | 8.3% (2/24, 95% CI [1.0, 27.0]) |
| `openai/gpt-oss-120b` | `full_context` | 116/120 | 4 | 97.4% (113/116, 95% CI [92.6, 99.5]) | 96.5% (112/116, 95% CI [91.4, 99.0]) | 90.7% (49/54, 95% CI [79.7, 96.9]) | 95.0% (19/20, 95% CI [75.1, 99.9]) |
| `openai/gpt-oss-120b` | `plus_prefilter` | 118/120 | 2 | 99.2% (117/118, 95% CI [95.4, 100.0]) | 99.2% (117/118, 95% CI [95.4, 100.0]) | 94.4% (51/54, 95% CI [84.6, 98.8]) | 100.0% (22/22, 95% CI [84.6, 100.0]) |
| `openai/gpt-oss-120b` | `plus_calculator` | 120/120 | 0 | 98.3% (118/120, 95% CI [94.1, 99.8]) | 96.7% (116/120, 95% CI [91.7, 99.1]) | 94.4% (51/54, 95% CI [84.6, 98.8]) | 91.7% (22/24, 95% CI [73.0, 99.0]) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | 120/120 | 0 | 100.0% (120/120, 95% CI [97.0, 100.0]) | 100.0% (120/120, 95% CI [97.0, 100.0]) | 100.0% (54/54, 95% CI [93.4, 100.0]) | 100.0% (24/24, 95% CI [85.8, 100.0]) |
| `qwen/qwen3.8-27b` | `zero_shot` | 120/120 | 0 | 95.8% (115/120, 95% CI [90.5, 98.6]) | 76.7% (92/120, 95% CI [68.1, 83.9]) | 48.1% (26/54, 95% CI [34.3, 62.2]) | 8.3% (2/24, 95% CI [1.0, 27.0]) |
| `qwen/qwen3.8-27b` | `full_context` | 119/120 | 1 | 94.1% (112/119, 95% CI [88.3, 97.6]) | 84.9% (101/119, 95% CI [77.2, 90.8]) | 85.2% (46/54, 95% CI [72.9, 93.4]) | 37.5% (9/24, 95% CI [18.8, 59.4]) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | 119/120 | 1 | 97.5% (116/119, 95% CI [92.8, 99.5]) | 84.0% (100/119, 95% CI [76.2, 90.1]) | 92.6% (50/54, 95% CI [82.1, 97.9]) | 33.3% (8/24, 95% CI [15.6, 55.3]) |
| `qwen/qwen3.8-27b` | `plus_calculator` | 119/120 | 1 | 98.3% (117/119, 95% CI [94.1, 99.8]) | 93.3% (111/119, 95% CI [87.2, 97.0]) | 96.3% (52/54, 95% CI [87.2, 99.5]) | 75.0% (18/24, 95% CI [53.3, 90.2]) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | 120/120 | 0 | 99.2% (119/120, 95% CI [95.4, 100.0]) | 99.2% (119/120, 95% CI [95.4, 100.0]) | 98.2% (53/54, 95% CI [90.1, 100.0]) | 100.0% (24/24, 95% CI [85.8, 100.0]) |

## 3. Financial Sub-Metrics, Latency, Tokens & Infra Breakdown

| Model | Architecture | Fin Text | Fin JSON | Fin Consistency | Sanitized | `length` Trunc | API Mean / P95 (ms) | Pipe Mean / P95 (ms) | Prompt / Compl (Reason) Tok | Est. Cost (USD) |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|
| `openai/gpt-oss-120b` | `zero_shot` | 8.3% (2/24) | N/A | N/A | 0 | 39 | 2014 / 2748 | 2014 / 2748 | 15777 / 88485 (20236) | $0.0555 |
| `openai/gpt-oss-120b` | `full_context` | 100.0% (20/20) | 93.3% (14/15) | 93.3% (14/15) | 0 | 2 | 1765 / 2727 | 1766 / 2727 | 277936 / 58295 (36273) | $0.0767 |
| `openai/gpt-oss-120b` | `plus_prefilter` | 100.0% (22/22) | 100.0% (16/16) | 100.0% (16/16) | 0 | 2 | 1721 / 2748 | 1724 / 2758 | 221342 / 57932 (35796) | $0.0680 |
| `openai/gpt-oss-120b` | `plus_calculator` | 100.0% (24/24) | 89.5% (17/19) | 89.5% (17/19) | 0 | 0 | 1829 / 2714 | 1830 / 2715 | 237924 / 59689 (37434) | $0.0715 |
| `openai/gpt-oss-120b` | `proposed_hybrid` | 100.0% (24/24) | 100.0% (24/24) | 100.0% (24/24) | 34 | 0 | 1790 / 2674 | 1797 / 2677 | 238938 / 58779 (36303) | $0.0711 |
| `qwen/qwen3.8-27b` | `zero_shot` | 8.3% (2/24) | N/A | N/A | 0 | 18 | 1465 / 2550 | 1465 / 2550 | 9390 / 66031 (0) | $0.2716 |
| `qwen/qwen3.8-27b` | `full_context` | 66.7% (16/24) | 37.5% (9/24) | 37.5% (9/24) | 0 | 1 | 1366 / 2299 | 1367 / 2299 | 298248 / 44168 (0) | $0.4153 |
| `qwen/qwen3.8-27b` | `plus_prefilter` | 54.2% (13/24) | 31.8% (7/22) | 31.8% (7/22) | 0 | 2 | 1267 / 2334 | 1268 / 2335 | 225748 / 44194 (0) | $0.3574 |
| `qwen/qwen3.8-27b` | `plus_calculator` | 100.0% (24/24) | 75.0% (18/24) | 75.0% (18/24) | 0 | 1 | 1401 / 2290 | 1402 / 2290 | 244564 / 41208 (0) | $0.3605 |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | 100.0% (24/24) | 100.0% (24/24) | 100.0% (24/24) | 26 | 3 | 1258 / 2023 | 1266 / 2035 | 247849 / 42162 (0) | $0.3669 |

### Infra Error Breakdown
- `openai/gpt-oss-120b` / `full_context`: 4 errors -> `{"400:http_400": 4}`
- `openai/gpt-oss-120b` / `plus_prefilter`: 2 errors -> `{"400:http_400": 2}`
- `qwen/qwen3.8-27b` / `full_context`: 1 errors -> `{"400:http_400": 1}`
- `qwen/qwen3.8-27b` / `plus_prefilter`: 1 errors -> `{"400:http_400": 1}`
- `qwen/qwen3.8-27b` / `plus_calculator`: 1 errors -> `{"400:http_400": 1}`

## 4. Per-Language Breakdown (EN / RU / KK)

| Model | Architecture | Lang | Valid | CSR (95% CI) | Faithfulness | Refusal | Financial Acc |
|---|---|---|---:|---|---|---|---|
| `openai/gpt-oss-120b` | `zero_shot` | EN | 40/40 | 87.5% (35/40, 95% CI [73.2, 95.8]) | 65.0% (26/40) | 5.6% (1/18) | 0.0% (0/8) |
| `openai/gpt-oss-120b` | `zero_shot` | RU | 40/40 | 87.5% (35/40, 95% CI [73.2, 95.8]) | 72.5% (29/40) | 5.6% (1/18) | 25.0% (2/8) |
| `openai/gpt-oss-120b` | `zero_shot` | KK | 40/40 | 87.5% (35/40, 95% CI [73.2, 95.8]) | 65.0% (26/40) | 27.8% (5/18) | 0.0% (0/8) |
| `openai/gpt-oss-120b` | `full_context` | EN | 40/40 | 92.5% (37/40, 95% CI [79.6, 98.4]) | 90.0% (36/40) | 83.3% (15/18) | 87.5% (7/8) |
| `openai/gpt-oss-120b` | `full_context` | RU | 39/40 | 100.0% (39/39, 95% CI [91.0, 100.0]) | 100.0% (39/39) | 100.0% (18/18) | 100.0% (7/7) |
| `openai/gpt-oss-120b` | `full_context` | KK | 37/40 | 100.0% (37/37, 95% CI [90.5, 100.0]) | 100.0% (37/37) | 88.9% (16/18) | 100.0% (5/5) |
| `openai/gpt-oss-120b` | `plus_prefilter` | EN | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 100.0% (40/40) | 94.4% (17/18) | 100.0% (8/8) |
| `openai/gpt-oss-120b` | `plus_prefilter` | RU | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 100.0% (40/40) | 100.0% (18/18) | 100.0% (8/8) |
| `openai/gpt-oss-120b` | `plus_prefilter` | KK | 38/40 | 97.4% (37/38, 95% CI [86.2, 99.9]) | 97.4% (37/38) | 88.9% (16/18) | 100.0% (6/6) |
| `openai/gpt-oss-120b` | `plus_calculator` | EN | 40/40 | 97.5% (39/40, 95% CI [86.8, 99.9]) | 95.0% (38/40) | 94.4% (17/18) | 87.5% (7/8) |
| `openai/gpt-oss-120b` | `plus_calculator` | RU | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 97.5% (39/40) | 100.0% (18/18) | 87.5% (7/8) |
| `openai/gpt-oss-120b` | `plus_calculator` | KK | 40/40 | 97.5% (39/40, 95% CI [86.8, 99.9]) | 97.5% (39/40) | 88.9% (16/18) | 100.0% (8/8) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | EN | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 100.0% (40/40) | 100.0% (18/18) | 100.0% (8/8) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | RU | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 100.0% (40/40) | 100.0% (18/18) | 100.0% (8/8) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | KK | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 100.0% (40/40) | 100.0% (18/18) | 100.0% (8/8) |
| `qwen/qwen3.8-27b` | `zero_shot` | EN | 40/40 | 92.5% (37/40, 95% CI [79.6, 98.4]) | 72.5% (29/40) | 55.6% (10/18) | 0.0% (0/8) |
| `qwen/qwen3.8-27b` | `zero_shot` | RU | 40/40 | 95.0% (38/40, 95% CI [83.1, 99.4]) | 77.5% (31/40) | 50.0% (9/18) | 12.5% (1/8) |
| `qwen/qwen3.8-27b` | `zero_shot` | KK | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 80.0% (32/40) | 38.9% (7/18) | 12.5% (1/8) |
| `qwen/qwen3.8-27b` | `full_context` | EN | 40/40 | 87.5% (35/40, 95% CI [73.2, 95.8]) | 80.0% (32/40) | 72.2% (13/18) | 37.5% (3/8) |
| `qwen/qwen3.8-27b` | `full_context` | RU | 39/40 | 97.4% (38/39, 95% CI [86.5, 99.9]) | 87.2% (34/39) | 94.4% (17/18) | 37.5% (3/8) |
| `qwen/qwen3.8-27b` | `full_context` | KK | 40/40 | 97.5% (39/40, 95% CI [86.8, 99.9]) | 87.5% (35/40) | 88.9% (16/18) | 37.5% (3/8) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | EN | 40/40 | 97.5% (39/40, 95% CI [86.8, 99.9]) | 82.5% (33/40) | 94.4% (17/18) | 25.0% (2/8) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | RU | 40/40 | 95.0% (38/40, 95% CI [83.1, 99.4]) | 82.5% (33/40) | 88.9% (16/18) | 37.5% (3/8) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | KK | 39/40 | 100.0% (39/39, 95% CI [91.0, 100.0]) | 87.2% (34/39) | 94.4% (17/18) | 37.5% (3/8) |
| `qwen/qwen3.8-27b` | `plus_calculator` | EN | 40/40 | 95.0% (38/40, 95% CI [83.1, 99.4]) | 90.0% (36/40) | 88.9% (16/18) | 75.0% (6/8) |
| `qwen/qwen3.8-27b` | `plus_calculator` | RU | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 95.0% (38/40) | 100.0% (18/18) | 75.0% (6/8) |
| `qwen/qwen3.8-27b` | `plus_calculator` | KK | 39/40 | 100.0% (39/39, 95% CI [91.0, 100.0]) | 94.9% (37/39) | 100.0% (18/18) | 75.0% (6/8) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | EN | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 100.0% (40/40) | 100.0% (18/18) | 100.0% (8/8) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | RU | 40/40 | 97.5% (39/40, 95% CI [86.8, 99.9]) | 97.5% (39/40) | 94.4% (17/18) | 100.0% (8/8) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | KK | 40/40 | 100.0% (40/40, 95% CI [91.2, 100.0]) | 100.0% (40/40) | 100.0% (18/18) | 100.0% (8/8) |

## 5. Per-Category Breakdown

| Model | Architecture | Category | Valid | CSR (95% CI) | Faithfulness | Refusal | Financial Acc |
|---|---|---|---:|---|---|---|---|
| `openai/gpt-oss-120b` | `zero_shot` | `budget` | 30/30 | 83.3% (25/30, 95% CI [65.3, 94.4]) | 80.0% (24/30) | 0.0% (0/6) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `availability` | 24/24 | 79.2% (19/24, 95% CI [57.9, 92.9]) | 75.0% (18/24) | 22.2% (4/18) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 8.3% (2/24) | N/A | 8.3% (2/24) |
| `openai/gpt-oss-120b` | `zero_shot` | `multi_constraint` | 18/18 | 72.2% (13/18, 95% CI [46.5, 90.3]) | 72.2% (13/18) | 0.0% (0/6) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `adversarial` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 25.0% (3/12) | N/A |
| `openai/gpt-oss-120b` | `zero_shot` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 0.0% (0/12) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `budget` | 30/30 | 100.0% (30/30, 95% CI [88.4, 100.0]) | 100.0% (30/30) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `availability` | 24/24 | 91.7% (22/24, 95% CI [73.0, 99.0]) | 91.7% (22/24) | 83.3% (15/18) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `finance` | 20/24 | 100.0% (20/20, 95% CI [83.2, 100.0]) | 95.0% (19/20) | N/A | 95.0% (19/20) |
| `openai/gpt-oss-120b` | `full_context` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `adversarial` | 12/12 | 91.7% (11/12, 95% CI [61.5, 99.8]) | 91.7% (11/12) | 83.3% (10/12) | N/A |
| `openai/gpt-oss-120b` | `full_context` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `budget` | 30/30 | 100.0% (30/30, 95% CI [88.4, 100.0]) | 100.0% (30/30) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `availability` | 24/24 | 95.8% (23/24, 95% CI [78.9, 99.9]) | 95.8% (23/24) | 94.4% (17/18) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `finance` | 22/24 | 100.0% (22/22, 95% CI [84.6, 100.0]) | 100.0% (22/22) | N/A | 100.0% (22/22) |
| `openai/gpt-oss-120b` | `plus_prefilter` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `adversarial` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 83.3% (10/12) | N/A |
| `openai/gpt-oss-120b` | `plus_prefilter` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `budget` | 30/30 | 100.0% (30/30, 95% CI [88.4, 100.0]) | 100.0% (30/30) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `availability` | 24/24 | 95.8% (23/24, 95% CI [78.9, 99.9]) | 95.8% (23/24) | 94.4% (17/18) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 91.7% (22/24) | N/A | 91.7% (22/24) |
| `openai/gpt-oss-120b` | `plus_calculator` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `adversarial` | 12/12 | 91.7% (11/12, 95% CI [61.5, 99.8]) | 91.7% (11/12) | 83.3% (10/12) | N/A |
| `openai/gpt-oss-120b` | `plus_calculator` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `budget` | 30/30 | 100.0% (30/30, 95% CI [88.4, 100.0]) | 100.0% (30/30) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `availability` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 100.0% (24/24) | 100.0% (18/18) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 100.0% (24/24) | N/A | 100.0% (24/24) |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 100.0% (6/6) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `adversarial` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `openai/gpt-oss-120b` | `proposed_hybrid` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `budget` | 30/30 | 100.0% (30/30, 95% CI [88.4, 100.0]) | 100.0% (30/30) | 83.3% (5/6) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `availability` | 24/24 | 83.3% (20/24, 95% CI [62.6, 95.3]) | 79.2% (19/24) | 38.9% (7/18) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 8.3% (2/24) | N/A | 8.3% (2/24) |
| `qwen/qwen3.8-27b` | `zero_shot` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 50.0% (3/6) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `adversarial` | 12/12 | 91.7% (11/12, 95% CI [61.5, 99.8]) | 91.7% (11/12) | 83.3% (10/12) | N/A |
| `qwen/qwen3.8-27b` | `zero_shot` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 8.3% (1/12) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `budget` | 29/30 | 100.0% (29/29, 95% CI [88.1, 100.0]) | 100.0% (29/29) | 100.0% (6/6) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `availability` | 24/24 | 87.5% (21/24, 95% CI [67.6, 97.3]) | 87.5% (21/24) | 83.3% (15/18) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 37.5% (9/24) | N/A | 37.5% (9/24) |
| `qwen/qwen3.8-27b` | `full_context` | `multi_constraint` | 18/18 | 77.8% (14/18, 95% CI [52.4, 93.6]) | 100.0% (18/18) | 33.3% (2/6) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `adversarial` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 91.7% (11/12) | N/A |
| `qwen/qwen3.8-27b` | `full_context` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `budget` | 29/30 | 100.0% (29/29, 95% CI [88.1, 100.0]) | 100.0% (29/29) | 100.0% (6/6) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `availability` | 24/24 | 91.7% (22/24, 95% CI [73.0, 99.0]) | 91.7% (22/24) | 88.9% (16/18) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 33.3% (8/24) | N/A | 33.3% (8/24) |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 100.0% (6/6) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `adversarial` | 12/12 | 91.7% (11/12, 95% CI [61.5, 99.8]) | 91.7% (11/12) | 83.3% (10/12) | N/A |
| `qwen/qwen3.8-27b` | `plus_prefilter` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `budget` | 29/30 | 100.0% (29/29, 95% CI [88.1, 100.0]) | 100.0% (29/29) | 100.0% (6/6) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `availability` | 24/24 | 91.7% (22/24, 95% CI [73.0, 99.0]) | 91.7% (22/24) | 88.9% (16/18) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 75.0% (18/24) | N/A | 75.0% (18/24) |
| `qwen/qwen3.8-27b` | `plus_calculator` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 100.0% (6/6) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `adversarial` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `qwen/qwen3.8-27b` | `plus_calculator` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `budget` | 30/30 | 100.0% (30/30, 95% CI [88.4, 100.0]) | 100.0% (30/30) | 100.0% (6/6) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `availability` | 24/24 | 95.8% (23/24, 95% CI [78.9, 99.9]) | 95.8% (23/24) | 94.4% (17/18) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `finance` | 24/24 | 100.0% (24/24, 95% CI [85.8, 100.0]) | 100.0% (24/24) | N/A | 100.0% (24/24) |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `multi_constraint` | 18/18 | 100.0% (18/18, 95% CI [81.5, 100.0]) | 100.0% (18/18) | 100.0% (6/6) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `adversarial` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |
| `qwen/qwen3.8-27b` | `proposed_hybrid` | `out_of_scope` | 12/12 | 100.0% (12/12, 95% CI [73.5, 100.0]) | 100.0% (12/12) | 100.0% (12/12) | N/A |

## 6. Paired Hypothesis Tests (Exact McNemar & Cluster-Aware Inference)
> **Methodological Note (P0.5):** Each semantic scenario (`n=40`) is instantiated in 3 languages (`EN/RU/KK` -> `n=120` queries). Query-level McNemar reports discordant counts over all matched queries, while **Scenario-Cluster tests (`n=40` independent `semanticScenarioId` clusters)** eliminate intra-scenario language correlation via (a) strict all-languages-pass McNemar and (b) 10,000-resample cluster bootstrap 95% CI + paired sign-flip permutation p-value.

| Model / Pair | Metric | Query McNemar (`n`, b/c, delta, p) | Strict Cluster McNemar (`n_clust`, b/c, delta, p) | Cluster Mean Delta (95% Boot CI) & Perm p |
|---|---|---|---|---|
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `csr` | n=116, (3/0), +2.6 pp, p=0.2500 | n=40, (3/0), +7.5 pp, p=0.2500 | +2.5 pp [+0.0, +5.8], perm p=0.2500 |
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `faithfulness` | n=116, (4/0), +3.5 pp, p=0.1250 | n=40, (4/0), +10.0 pp, p=0.1250 | +3.3 pp [+0.8, +6.7], perm p=0.1250 |
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `refusal` | n=54, (5/0), +9.3 pp, p=0.0625 | n=18, (5/0), +27.8 pp, p=0.0625 | +9.3 pp [+3.7, +16.7], perm p=0.0625 |
| [openai/gpt-oss-120b] proposed_hybrid vs full_context | `financialAccuracy` | n=20, (1/0), +5.0 pp, p=1.0000 | n=8, (1/0), +12.5 pp, p=1.0000 | +4.2 pp [+0.0, +12.5], perm p=1.0000 |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `csr` | n=120, (15/0), +12.5 pp, p=6.10e-05 (<0.0001) | n=40, (8/0), +20.0 pp, p=0.0078 | +12.5 pp [+5.0, +21.7], perm p=0.0078 |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `faithfulness` | n=120, (39/0), +32.5 pp, p=3.64e-12 (<0.0001) | n=40, (16/0), +40.0 pp, p=3.05e-05 (<0.0001) | +32.5 pp [+19.2, +45.8], perm p=3.05e-05 (<0.0001) |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `refusal` | n=54, (47/0), +87.0 pp, p=1.42e-14 (<0.0001) | n=18, (17/0), +94.4 pp, p=1.53e-05 (<0.0001) | +87.0 pp [+74.1, +96.3], perm p=5.00e-05 (<0.0001) |
| [openai/gpt-oss-120b] proposed_hybrid vs zero_shot | `financialAccuracy` | n=24, (22/0), +91.7 pp, p=4.77e-07 (<0.0001) | n=8, (8/0), +100.0 pp, p=0.0078 | +91.7 pp [+79.2, +100.0], perm p=0.0078 |
| [openai/gpt-oss-120b] full_context vs zero_shot | `csr` | n=116, (15/3), +10.3 pp, p=0.0075 | n=40, (7/2), +12.5 pp, p=0.1797 | +10.0 pp [+1.7, +19.2], perm p=0.0547 |
| [openai/gpt-oss-120b] full_context vs zero_shot | `faithfulness` | n=116, (35/3), +27.6 pp, p=6.68e-08 (<0.0001) | n=40, (14/2), +30.0 pp, p=0.0042 | +30.0 pp [+16.7, +44.2], perm p=0.0005 |
| [openai/gpt-oss-120b] full_context vs zero_shot | `refusal` | n=54, (43/1), +77.8 pp, p=5.12e-12 (<0.0001) | n=18, (12/0), +66.7 pp, p=0.0005 | +77.8 pp [+63.0, +90.7], perm p=5.00e-05 (<0.0001) |
| [openai/gpt-oss-120b] full_context vs zero_shot | `financialAccuracy` | n=20, (18/0), +90.0 pp, p=7.63e-06 (<0.0001) | n=8, (7/0), +87.5 pp, p=0.0156 | +91.7 pp [+79.2, +100.0], perm p=0.0078 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `csr` | n=116, (3/1), +1.7 pp, p=0.6250 | n=40, (3/1), +5.0 pp, p=0.6250 | +1.7 pp [-1.7, +5.0], perm p=0.6250 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `faithfulness` | n=116, (4/1), +2.6 pp, p=0.3750 | n=40, (4/1), +7.5 pp, p=0.3750 | +2.5 pp [-0.8, +6.7], perm p=0.3750 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `refusal` | n=54, (4/2), +3.7 pp, p=0.6875 | n=18, (4/1), +16.7 pp, p=0.3750 | +3.7 pp [-5.6, +13.0], perm p=0.6875 |
| [openai/gpt-oss-120b] plus_prefilter vs full_context | `financialAccuracy` | n=20, (1/0), +5.0 pp, p=1.0000 | n=8, (1/0), +12.5 pp, p=1.0000 | +4.2 pp [+0.0, +12.5], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `csr` | n=118, (0/1), -0.8 pp, p=1.0000 | n=40, (0/1), -2.5 pp, p=1.0000 | -0.8 pp [-2.5, +0.0], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `faithfulness` | n=118, (0/3), -2.5 pp, p=0.2500 | n=40, (0/3), -7.5 pp, p=0.2500 | -2.5 pp [-5.8, +0.0], perm p=0.2500 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `refusal` | n=54, (1/1), +0.0 pp, p=1.0000 | n=18, (0/1), -5.6 pp, p=1.0000 | -0.0 pp [-5.6, +5.6], perm p=1.0000 |
| [openai/gpt-oss-120b] plus_calculator vs plus_prefilter | `financialAccuracy` | n=22, (0/2), -9.1 pp, p=0.5000 | n=8, (0/2), -25.0 pp, p=0.5000 | -8.3 pp [-20.8, +0.0], perm p=0.5000 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `csr` | n=120, (2/0), +1.7 pp, p=0.5000 | n=40, (2/0), +5.0 pp, p=0.5000 | +1.7 pp [+0.0, +4.2], perm p=0.5000 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `faithfulness` | n=120, (4/0), +3.3 pp, p=0.1250 | n=40, (4/0), +10.0 pp, p=0.1250 | +3.3 pp [+0.8, +6.7], perm p=0.1250 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `refusal` | n=54, (3/0), +5.6 pp, p=0.2500 | n=18, (3/0), +16.7 pp, p=0.2500 | +5.6 pp [+0.0, +11.1], perm p=0.2500 |
| [openai/gpt-oss-120b] proposed_hybrid vs plus_calculator | `financialAccuracy` | n=24, (2/0), +8.3 pp, p=0.5000 | n=8, (2/0), +25.0 pp, p=0.5000 | +8.3 pp [+0.0, +20.8], perm p=0.5000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `csr` | n=119, (7/1), +5.0 pp, p=0.0703 | n=40, (4/0), +10.0 pp, p=0.1250 | +5.0 pp [+0.8, +10.8], perm p=0.1250 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `faithfulness` | n=119, (18/1), +14.3 pp, p=7.63e-05 (<0.0001) | n=40, (7/0), +17.5 pp, p=0.0156 | +14.2 pp [+5.0, +25.0], perm p=0.0156 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `refusal` | n=54, (8/1), +13.0 pp, p=0.0391 | n=18, (5/0), +27.8 pp, p=0.0625 | +13.0 pp [+3.7, +24.1], perm p=0.0625 |
| [qwen/qwen3.8-27b] proposed_hybrid vs full_context | `financialAccuracy` | n=24, (15/0), +62.5 pp, p=6.10e-05 (<0.0001) | n=8, (5/0), +62.5 pp, p=0.0625 | +62.5 pp [+25.0, +87.5], perm p=0.0625 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `csr` | n=120, (4/0), +3.3 pp, p=0.1250 | n=40, (3/0), +7.5 pp, p=0.2500 | +3.3 pp [+0.0, +7.5], perm p=0.2500 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `faithfulness` | n=120, (27/0), +22.5 pp, p=1.49e-08 (<0.0001) | n=40, (11/0), +27.5 pp, p=0.0010 | +22.5 pp [+10.8, +35.0], perm p=0.0005 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `refusal` | n=54, (27/0), +50.0 pp, p=1.49e-08 (<0.0001) | n=18, (13/0), +72.2 pp, p=0.0002 | +50.0 pp [+33.3, +66.7], perm p=0.0001 |
| [qwen/qwen3.8-27b] proposed_hybrid vs zero_shot | `financialAccuracy` | n=24, (22/0), +91.7 pp, p=4.77e-07 (<0.0001) | n=8, (8/0), +100.0 pp, p=0.0078 | +91.7 pp [+75.0, +100.0], perm p=0.0078 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `csr` | n=119, (4/6), -1.7 pp, p=0.7539 | n=40, (2/3), -2.5 pp, p=1.0000 | -1.7 pp [-8.3, +4.2], perm p=0.8125 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `faithfulness` | n=119, (14/4), +8.4 pp, p=0.0309 | n=40, (5/1), +10.0 pp, p=0.2188 | +8.3 pp [-0.8, +19.2], perm p=0.1484 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `refusal` | n=54, (25/5), +37.0 pp, p=0.0003 | n=18, (9/1), +44.4 pp, p=0.0215 | +37.0 pp [+16.7, +59.3], perm p=0.0073 |
| [qwen/qwen3.8-27b] full_context vs zero_shot | `financialAccuracy` | n=24, (9/2), +29.2 pp, p=0.0654 | n=8, (3/0), +37.5 pp, p=0.2500 | +29.2 pp [-12.5, +75.0], perm p=0.2500 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `csr` | n=118, (6/2), +3.4 pp, p=0.2891 | n=40, (3/1), +5.0 pp, p=0.6250 | +3.3 pp [-0.8, +9.2], perm p=0.3750 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `faithfulness` | n=118, (2/3), -0.8 pp, p=1.0000 | n=40, (1/2), -2.5 pp, p=1.0000 | -0.8 pp [-3.3, +1.7], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `refusal` | n=54, (6/2), +7.4 pp, p=0.2891 | n=18, (3/1), +11.1 pp, p=0.6250 | +7.4 pp [-1.9, +18.5], perm p=0.3750 |
| [qwen/qwen3.8-27b] plus_prefilter vs full_context | `financialAccuracy` | n=24, (0/1), -4.2 pp, p=1.0000 | n=8, (0/1), -12.5 pp, p=1.0000 | -4.2 pp [-12.5, +0.0], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `csr` | n=118, (2/1), +0.8 pp, p=1.0000 | n=40, (1/0), +2.5 pp, p=1.0000 | +0.8 pp [+0.0, +2.5], perm p=1.0000 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `faithfulness` | n=118, (12/1), +9.3 pp, p=0.0034 | n=40, (5/0), +12.5 pp, p=0.0625 | +9.2 pp [+1.7, +18.3], perm p=0.0625 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `refusal` | n=54, (3/1), +3.7 pp, p=0.6250 | n=18, (2/0), +11.1 pp, p=0.5000 | +3.7 pp [+0.0, +9.3], perm p=0.5000 |
| [qwen/qwen3.8-27b] plus_calculator vs plus_prefilter | `financialAccuracy` | n=24, (10/0), +41.7 pp, p=0.0020 | n=8, (4/0), +50.0 pp, p=0.1250 | +41.7 pp [+12.5, +75.0], perm p=0.1250 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `csr` | n=119, (2/1), +0.8 pp, p=1.0000 | n=40, (2/1), +2.5 pp, p=1.0000 | +0.8 pp [-1.7, +4.2], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `faithfulness` | n=119, (8/1), +5.9 pp, p=0.0391 | n=40, (4/1), +7.5 pp, p=0.3750 | +5.8 pp [-0.0, +14.2], perm p=0.2500 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `refusal` | n=54, (2/1), +1.9 pp, p=1.0000 | n=18, (2/1), +5.6 pp, p=1.0000 | +1.9 pp [-3.7, +7.4], perm p=1.0000 |
| [qwen/qwen3.8-27b] proposed_hybrid vs plus_calculator | `financialAccuracy` | n=24, (6/0), +25.0 pp, p=0.0313 | n=8, (2/0), +25.0 pp, p=0.5000 | +25.0 pp [+0.0, +62.5], perm p=0.5000 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=120, (4/14), -8.3 pp, p=0.0309 | n=40, (2/6), -10.0 pp, p=0.2891 | -8.3 pp [-17.5, +0.0], perm p=0.1133 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=120, (6/17), -9.2 pp, p=0.0347 | n=40, (2/6), -10.0 pp, p=0.2891 | -9.2 pp [-20.0, +0.8], perm p=0.1296 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=54, (0/19), -35.2 pp, p=3.81e-06 (<0.0001) | n=18, (0/3), -16.7 pp, p=0.2500 | -35.2 pp [-50.0, -20.4], perm p=0.0005 |
| [zero_shot] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=24, (2/2), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [-20.8, +16.7], perm p=1.0000 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=115, (5/1), +3.5 pp, p=0.2188 | n=40, (3/1), +5.0 pp, p=0.6250 | +3.3 pp [-0.8, +9.2], perm p=0.3750 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=115, (11/1), +8.7 pp, p=0.0063 | n=40, (5/1), +10.0 pp, p=0.2188 | +11.7 pp [+2.5, +22.5], perm p=0.0469 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=54, (5/2), +5.6 pp, p=0.4531 | n=18, (3/2), +5.6 pp, p=1.0000 | +5.6 pp [-5.6, +18.5], perm p=0.5625 |
| [full_context] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=20, (10/0), +50.0 pp, p=0.0020 | n=8, (4/0), +50.0 pp, p=0.1250 | +58.3 pp [+25.0, +87.5], perm p=0.0625 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=117, (3/1), +1.7 pp, p=0.6250 | n=40, (3/1), +5.0 pp, p=0.6250 | +1.7 pp [-1.7, +5.0], perm p=0.6250 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=117, (17/1), +13.7 pp, p=0.0001 | n=40, (9/1), +20.0 pp, p=0.0215 | +15.0 pp [+5.0, +25.8], perm p=0.0117 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=54, (3/2), +1.9 pp, p=1.0000 | n=18, (3/1), +11.1 pp, p=0.6250 | +1.9 pp [-5.6, +9.3], perm p=1.0000 |
| [plus_prefilter] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=22, (14/0), +63.6 pp, p=0.0001 | n=8, (6/0), +75.0 pp, p=0.0313 | +66.7 pp [+33.3, +91.7], perm p=0.0312 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=119, (2/2), +0.0 pp, p=1.0000 | n=40, (2/2), +0.0 pp, p=1.0000 | +0.0 pp [-3.3, +3.3], perm p=1.0000 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=119, (7/3), +3.4 pp, p=0.3437 | n=40, (3/3), +0.0 pp, p=1.0000 | +3.3 pp [-2.5, +10.8], perm p=0.5156 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=54, (2/3), -1.9 pp, p=1.0000 | n=18, (2/3), -5.6 pp, p=1.0000 | -1.9 pp [-9.3, +5.6], perm p=1.0000 |
| [plus_calculator] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=24, (5/1), +16.7 pp, p=0.2188 | n=8, (1/1), +0.0 pp, p=1.0000 | +16.7 pp [-8.3, +45.8], perm p=0.5000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `csr` | n=120, (1/0), +0.8 pp, p=1.0000 | n=40, (1/0), +2.5 pp, p=1.0000 | +0.8 pp [+0.0, +2.5], perm p=1.0000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `faithfulness` | n=120, (1/0), +0.8 pp, p=1.0000 | n=40, (1/0), +2.5 pp, p=1.0000 | +0.8 pp [+0.0, +2.5], perm p=1.0000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `refusal` | n=54, (1/0), +1.9 pp, p=1.0000 | n=18, (1/0), +5.6 pp, p=1.0000 | +1.9 pp [+0.0, +5.6], perm p=1.0000 |
| [proposed_hybrid] openai/gpt-oss-120b vs qwen/qwen3.8-27b | `financialAccuracy` | n=24, (0/0), +0.0 pp, p=1.0000 | n=8, (0/0), +0.0 pp, p=1.0000 | +0.0 pp [+0.0, +0.0], perm p=1.0000 |
