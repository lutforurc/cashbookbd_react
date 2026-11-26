/**
 * npm run i18n:check
 *
 * Node only, no packages. It guards the translation files the same way
 * check-help.mjs guards the Help folder:
 *
 *   1. every locale JSON parses;
 *   2. every key in the bundled English files also exists in each other
 *      language -- reported as a list and a percentage, never a failure,
 *      because a half-finished translation is normal;
 *   3. every t('...') key written in the source exists in an English file --
 *      a missing English key is a broken screen, so this one fails.
 *
 * Hardcoded English in .tsx is deliberately NOT checked yet; that rule gets
 * stricter in Phase 2.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = path.join(root, 'src', 'locales');
const enDir = path.join(localesDir, 'en');
const srcDir = path.join(root, 'src');

const problems = [];
const fail = (message) => problems.push(message);

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const listJson = (directory) => {
  const files = [];

  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;

      const full = path.join(current, entry.name);

      if (entry.isDirectory()) walk(full);
      else if (entry.name.toLowerCase().endsWith('.json')) files.push(full);
    }
  };

  if (fs.existsSync(directory)) walk(directory);

  return files;
};

const readJson = (file, label) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${label}: JSON ভাঙা — ${error.message}`);
    return null;
  }
};

/** { a: { b: 'x' } } -> { 'a.b': 'x' } */
const flatten = (value, prefix = '', out = {}) => {
  if (!isObject(value)) return out;

  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;

    if (isObject(child)) flatten(child, full, out);
    else out[full] = child;
  }

  return out;
};

/** namespace = the file's name without .json; the loadPath has no folders. */
const namespaceOf = (file) => path.basename(file, '.json');

/* -- English: the ceiling every other language is measured against ---------- */

const enNamespaces = {};

for (const file of listJson(enDir)) {
  const label = path.relative(root, file);
  const json = readJson(file, label);

  if (!json) continue;

  enNamespaces[namespaceOf(file)] = flatten(json);
}

if (Object.keys(enNamespaces).length === 0) {
  fail('src/locales/en/ ফোল্ডারে কোনো অনুবাদ ফাইল নেই');
}

/* -- every other language --------------------------------------------------- */

const languages = [];

if (fs.existsSync(localesDir)) {
  for (const entry of fs.readdirSync(localesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'en') continue;

    const code = entry.name;
    const languageDir = path.join(localesDir, code);
    const namespaceKeys = {};

    for (const file of listJson(languageDir)) {
      const label = path.relative(root, file);
      const json = readJson(file, label);

      if (!json) continue;

      namespaceKeys[namespaceOf(file)] = {
        keys: flatten(json),
        file: label,
      };
    }

    languages.push({ code, namespaceKeys });
  }
}

const report = [];

for (const language of languages) {
  for (const [namespace, enKeys] of Object.entries(enNamespaces)) {
    const translated = language.namespaceKeys[namespace];
    const total = Object.keys(enKeys).length;
    const missing = translated
      ? Object.keys(enKeys).filter((key) => !(key in translated.keys))
      : Object.keys(enKeys);
    const done = total - missing.length;
    const percentage = total === 0 ? 100 : Math.round((done / total) * 100);

    report.push({ code: language.code, namespace, done, total, missing, percentage });
  }
}

/* -- t('...') in the source -------------------------------------------------- */

const sourceFiles = [];
const walkSource = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;

    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) walkSource(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) sourceFiles.push(full);
  }
};

if (fs.existsSync(srcDir)) walkSource(srcDir);

const references = [];

for (const file of sourceFiles) {
  // Comments quote example calls; only real calls count.
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  for (const match of text.matchAll(/(?<![\w$.])t\(\s*['"]([^'"]+)['"]/g)) {
    references.push({ key: match[1], file: path.relative(root, file) });
  }
}

for (const reference of references) {
  const separator = reference.key.indexOf(':');
  const namespace = separator >= 0 ? reference.key.slice(0, separator) : 'common';
  const key = separator >= 0 ? reference.key.slice(separator + 1) : reference.key;

  if (!enNamespaces[namespace]) {
    fail(`${reference.file}: t('${reference.key}') — "${namespace}" namespace-এর en ফাইল নেই`);
    continue;
  }

  if (!(key in enNamespaces[namespace])) {
    fail(`${reference.file}: t('${reference.key}') — src/locales/en/${namespace}.json-এ key নেই`);
  }
}

/* -- report ----------------------------------------------------------------- */

if (report.length) {
  console.log('\nঅনুবাদের অবস্থা:');

  for (const row of report) {
    const where = `${row.code}/${row.namespace}.json`;
    console.log(
      `  ${where}: ${row.done}/${row.total} (${row.percentage}%)` +
        (row.missing.length ? ` — বাকি: ${row.missing.length}` : ' — সম্পূর্ণ'),
    );
  }

  const incomplete = report.filter((row) => row.missing.length);

  for (const row of incomplete) {
    console.log(`\n  ${row.code}/${row.namespace}.json-এ নেই (${row.missing.length}):`);
    row.missing.slice(0, 40).forEach((key) => console.log(`    - ${key}`));

    if (row.missing.length > 40) {
      console.log(`    … আরও ${row.missing.length - 40}টি`);
    }
  }
}

if (problems.length > 0) {
  console.error(`\ni18n যাচাই ব্যর্থ — ${problems.length}টি সমস্যা:\n`);
  problems.forEach((problem) => console.error('  ✗ ' + problem));
  console.error('\nঠিক করে আবার চালান: npm run i18n:check\n');
  process.exit(1);
}

console.log(
  `\ni18n যাচাই ঠিক আছে — ${Object.keys(enNamespaces).length}টি en namespace, ` +
    `${languages.length}টি ভাষা, ${references.length}টি t() ব্যবহার।`,
);
