# Taste
- Do not stop after writing a plan — actually implement the change and complete the task end-to-end; declines plan mode and prefers the agent to go straight into exploration/implementation. Confidence: 0.85
- Follow the project's existing patterns and conventions when implementing new features rather than introducing a different approach. Confidence: 0.75
- Avoid breaking existing functionality; when adding/replacing a feature, keep any current related systems (e.g. existing print/PDF/export paths) working. Confidence: 0.7
- Verify the work: run build/tests and do manual verification, and report the results. Confidence: 0.7
- Never invent or assume new calculation rules or data fields. If required data isn't present, investigate whether it can be safely derived from existing data; if it can't, report the limitation instead of displaying incorrect information. Confidence: 0.8
- Reuse existing layout/setting mechanisms where possible (e.g. mirror the Sales Invoice template pattern for line layouts) instead of creating parallel systems. Confidence: 0.6
- Handle edge cases explicitly: missing/empty fields should not render empty labels or wasted space; guard against overlapping, truncated, or wrongly paginated text on multi-page reports; handle Bengali and English text, currency formatting, and empty-data states. Confidence: 0.7
- Wants semantically distinct-but-similar fields (e.g. hand-entered manual voucher/challan numbers vs system-generated voucher numbers) kept clearly separate in names and labels so they can never be confused, and only surfaced when a real value exists. Confidence: 0.6
- Task specs are written in Bengali (in a project/codebase that is otherwise in English). Confidence: 0.5
- In the final response, provide a list of the changed files, instructions on how to use the new feature, and the results of build/test and manual verification. Confidence: 0.85
- When extending an existing feature to a new option/mode, bring it to full parity with the analogous existing option (same fields, editing, validation, saving) while leaving the existing option's workflow intact. Confidence: 0.6
- Editing a record that has accounting/ledger side effects must reconcile them: adjust the previously posted amount/account in place and keep repeated saves idempotent so nothing is ever double-posted. Confidence: 0.55
 
