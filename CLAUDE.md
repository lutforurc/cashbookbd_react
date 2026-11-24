# Project rules

When a screen's menu, labels, fields or behaviour change, update its help topic in
public/help/ in the same work, then run npm run help:check.

When a screen's visible words change, update the translation files in the same
work: `src/locales/en/` is mandatory (English is always present), and the matching
`public/locales/<language>/` file follows when that language has a translation.
New screens and buttons use `t('…')`, never a hardcoded English string. Then run
`npm run i18n:check`.
