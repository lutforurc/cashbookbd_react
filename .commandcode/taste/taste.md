# Taste

- Optional numeric charge fields on an entry form start genuinely empty — a blank box — rather than pre-filled with `0`, including on an existing record that has no value in that field; the blank is coerced to `0` only for calculations and in the save payload so the API never receives null. Confidence: 0.5
