# Taste Profile

## Coding Style & Correctness
- Fix the true root cause of bugs rather than suppressing the symptom. In SQL, do not disable `ONLY_FULL_GROUP_BY`, change global/session SQL mode, or paper over errors with `ANY_VALUE`, `DISTINCT`, or arbitrary aggregates — restructure the query/A)logic instead. Confidence: 0.8
- Prefers preserving existing behavior/semantics while making a fix — keep permissions, company/branch isolation, payload shapes, and other working behavior intact. Confidence: 0.6
- Values verifying edge cases (empty/null, duplicates, rounding, repeated inputs) and having parts sum exactly to the whole, instead of producing inflated or duplicated totals. Confidence: 0.55

## Workflow
- The user explicitly controls git operations: never commit, push, or deploy unless asked to. Confidence: 0.65
