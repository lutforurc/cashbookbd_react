# Taste

- Expects keyboard shortcuts to behave consistently across data-entry screens — Ctrl+S saves, Ctrl+U updates — so a newly wired form matches a screen where the shortcut already works (e.g. Cash Received) instead of getting its own variant. Confidence: 0.55
- Expects Enter in a list/report search box to run the search exactly as that screen's Search/Apply button does — same handler, same filters, same paging reset — and asks for it as a short standing fix ("Search এ Enter দিলে যেন রান হয়"), coming back with the same request for each screen that still lacks it rather than accepting a mouse-only search. Confidence: 0.6
- Optional numeric charge fields on an entry form start genuinely empty — a blank box — rather than pre-filled with `0`, including on an existing record that has no value in that field; the blank is coerced to `0` only for calculations and in the save payload so the API never receives null. Confidence: 0.5
