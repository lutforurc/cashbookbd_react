# Taste Profile

## Coding Style & Correctness
- Fix the true root cause of bugs rather than suppressing the symptom. In SQL, do not disable `ONLY_FULL_GROUP_BY`, change global/session SQL mode, or paper over errors with `ANY_VALUE`, `DISTINCT`, or arbitrary aggregates — restructure the query/A)logic instead. Confidence: 0.8
- Prefers preserving existing behavior/semantics while making a fix — keep permissions, company/branch isolation, payload shapes, and other working behavior intact (e.g. when widening a permission grant, explicitly preserve the previously-granted role's rows). Confidence: 0.65
- Scope authorization/permission changes to least privilege: grant only to the specific role(s) intended, never bypass authorization, and never broaden a grant to all roles. Confidence: 0.7
- Values verifying edge cases (empty/null, duplicates, rounding, repeated inputs) and having parts sum exactly to the whole, instead of producing inflated or duplicated totals. Confidence: 0.55

## Workflow
- The user explicitly controls git operations: never commit, push, or deploy unless asked to. Confidence: 0.8
- Takes the commit/push split literally: a bare "commit" instruction means commit only — push (and deploy) is never inferred from it, only from an explicit "push". Confidence: 0.6
- Expects git conflict resolution to be a careful semantic merge, not a mechanical pick: read both sides and preserve the intended functionality and recent changes from each, and explicitly "do not blindly choose ours or theirs". Confidence: 0.55
- Expects git work to stay non-destructive and bounded: preserve unrelated uncommitted work, do not start a new merge/rebase/pull, and never use destructive reset/clean commands. Confidence: 0.55
- For conflict work, wants the resolved files staged (when required) but nothing committed, pushed, or deployed, followed by a summary of the resolved files, the decisions taken, verification results, and any remaining in-progress git operation (or a clear statement that no conflicts exist). Confidence: 0.55
- Wants investigation/reporting before implementation: explicitly gates changes ("do not make any changes yet") and expects an upfront statement of capabilities and limitations (including whether results can actually be verified) before work begins. Confidence: 0.6
- Runs explicit read-only audit passes where the deliverable is findings only — no code, style, functionality, or config changes (and no commit/push/deploy). Confidence: 0.75
- Will not use credentials found in source files or audit documents; requires an explicitly approved, disposable/non-production test account with a broad read-only role to reach authenticated areas. Confidence: 0.8
- For audits/large sweeps, demands exhaustive coverage of every discovered route/page, worked through in manageable batches, rather than a few representative samples. Confidence: 0.7
- Once the approach/authentication is confirmed, prefers the agent to proceed autonomously through the remaining batches without pausing for further confirmation on non-destructive, read-only work. Confidence: 0.7
- Maintains a route-by-route coverage ledger and expects tracking artifacts kept current; stale/paused status notes (e.g., a TODO still marked "waiting on login") should be updated as soon as their blocker is resolved. Confidence: 0.65
- Verifies UI/visual work against the running application (dev server) using real browser screenshots where possible, rather than reasoning purely from source. Confidence: 0.55
- When asked to verify the actual UI, expects the real rendered output to be exercised (e.g. rendering the actual component and asserting its markup) — a passing build/typecheck alone is not accepted as UI verification, and when the live app can't be driven (needs backend/login) that limitation must be stated along with what was actually rendered. Confidence: 0.55
- Never prints/echoes secret values (passwords, tokens) in output; restricts auth automation to an explicitly approved disposable test account. Confidence: 0.75
- Works on Windows and expects commands/instructions that run in Windows PowerShell — does not assume Unix conventions (e.g., Ctrl+D for stdin) apply. Confidence: 0.75
- Verifies tooling/CLI syntax against actual `--help` output rather than assuming flags exist. Confidence: 0.6
- Wants to see/interact with the exact browser window being automated (foregrounded window or a streamed/dashboard view) rather than acting on a window they cannot observe. Confidence: 0.6
- When fixing/resetting tooling, scope destructive actions tightly to the isolated task process — restart only the audit/agent session and never close, kill, or disturb the user's own personal browser or other unrelated processes. Confidence: 0.6
- Expects prior work artifacts (audit findings, screenshots) to survive environment restarts/resets rather than being lost. Confidence: 0.5

## Communication & Reporting
- Prefers report findings in English. Confidence: 0.75
- Wants findings delivered as a structured table with explicit columns: page/module + route, the specific inconsistency, evidence (screenshot or source file), user impact, severity (High/Medium/Low), recommended correction, and whether the fix belongs in a shared component/theme or an individual page. Confidence: 0.8
- In a review/audit, expects findings grouped into distinct classes — confirmed bugs vs UI/usability improvements vs optional feature suggestions — and each finding tagged with the layer it needs (frontend, API, or database); explicitly wants missing features distinguished from features that already work. Confidence: 0.6
- Prioritizes improvements that are practical for daily operators over speculative or cosmetic work when ranking review findings. Confidence: 0.55
- Wants intentional design differences distinguished from genuine inconsistencies, and repeated issues grouped into a single finding that lists affected pages. Stylistic observations (e.g., a grey default CTA) are framed as recommendations unless they clearly breach an established design rule. Confidence: 0.7
- Prefers fixes to live in the shared design system — theme tokens and shared components as a single source of truth — over per-page one-off patches; flags hardcoded styles and duplicated patterns. Confidence: 0.6
- Requires claims to be backed by conclusive evidence: distinguishes observed behavior from a diagnosed root cause and rejects indirect signals (e.g., empty login fields or empty browser storage) as proof of a conclusion. Confidence: 0.75
- Scopes verification claims strictly to what was actually checked: never describes a page as "clean"/passing beyond the states and checks performed, and explicitly distinguishes sampled (representative breakpoint or dark-mode) checks from fully verified routes. Confidence: 0.8
- Wants one consolidated final report (severity, evidence, recommended fixes) that also enumerates remaining coverage gaps. Confidence: 0.7
- Wants each verification item reported as PASS / FAIL / NOT TESTED accurately; syntax, lint, build, or formula checks alone do not count as end-to-end verification, and untested areas must be called out rather than implied as passing. Confidence: 0.7
