# Aluminium & Glass Business — Feature Spec

> **Status:** Planned (not started). Reference spec for a future "aluminium & glass"
> (থাই অ্যালুমিনিয়াম ও গ্লাস) module/app. Last updated: 2026-07-05.

## Overview

Recommendation: add this as a new **business type inside the existing cashbookbd**
app (reuses Chart of Accounts, inventory, invoicing, installments/due, and the
customer portal) rather than building a separate app. **Build approach is not yet
decided.**

---

## Glass cut-piece billing & stock logic (CONFIRMED / locked)

### Stock item identity
A glass stock item is defined by:

```
base_type + thickness_mm + width_ft (fixed) + colour
```

- Stock is kept **per colour** (Blue ≠ Green even if same type/thickness).
- Brand / finish as an extra dimension = **still open**.

### Per glass-type config
| Field | Meaning |
|---|---|
| `full_length_ft` | Full sheet length (e.g. 12) |
| `threshold_ft` | = half of full length; **configurable per type** (sheet sizes differ) |
| `default_rate_per_ft` | Default rate; **editable per sale line** |

### Selling rules

**From a FULL sheet** (length `L`, threshold `T` = half) — two tiers only:

| Required | Billed | Cut-piece created |
|---|---|---|
| ≤ T | **T** | L − T |
| > T | **full L** | L − required |

Example: 12 ft sheet, T = 6 → the bill is either **6** or **12**.

**From a CUT-PIECE** (length `P`): **no rounding** — bill the actual requested
length `x`; remainder `(P − x)` stays as a smaller cut-piece.

### Other rules
- Only the **same colour/variant** is cut/combined.
- **Width is always fixed** — the full sheet width is sold; only the **length** is cut.
- **Price = billed_length_ft × rate/ft**; the **rate is editable per line** (can be
  higher or lower — negotiable; cut-piece rate also varies).

### Stock model
- Track (a) count of **full sheets** and (b) **each cut-piece individually** as its
  own row: `{ glass_type_id, length_ft, status }`.
- **Billed qty ≠ physical length consumed.** e.g. required 7 → billed 12, but 7 ft
  physically leaves + a 5 ft cut-piece returns to stock. Store both.
- Every sale auto-generates the cut-piece back into stock, so stock always
  reconciles: `sold + cut-piece = original length`.

---

## Worked example (sample invoice)

| # | Item | Source | Req. ft | Billed ft | Cut-piece back |
|---|---|---|---|---|---|
| 1 | Reflective · Blue · 5 mm · 3 ft | Full sheet (12) | 4 | **6** (↑ half) | 6 ft |
| 2 | Clear · 5 mm · 3 ft | Full sheet (12) | 7 | **12** (↑ full) | 5 ft |
| 3 | Tinted · Green · 5 mm · 3 ft | Cut-piece (6) | 2 | **2** (actual) | 4 ft |
| 4 | Aluminium Sliding Frame · Brown | — | 24 ft | 24 | — |
| 5 | Hardware — Roller & Lock set | — | — | 2 pc | — |

Pricing per running foot × billed length; rate editable per line. Invoice combines
glass + aluminium + hardware, then Subtotal → Discount → Grand Total → Advance →
Balance Due, plus Taka-in-words and a cutting-policy note.

---

## Not yet specced (open for later)

- Build target: extend cashbookbd vs new app.
- Aluminium **profile** cut-piece rule (bars ~19–21 ft): same two-tier or actual
  length? Sold per **ft vs kg**?
- **Quotation** combining glass + profile + hardware.
- Per-window **BOM / material estimate**; fabrication + installation labour costing;
  cutting wastage.
- Brand / finish as a stock dimension; cut-piece default rate.
