/**
 * npm run help:check
 *
 * Node only, no packages. It refuses a Help folder that would break the screen:
 * bad JSON, a topic with no title/module/sections, a section with no heading, an
 * index that disagrees with the module files, or a screen pointing at a topic
 * that does not exist.
 *
 * ⚠️ The component scan reads source files; the writing itself is never in
 * them. This is the one place that ties a screen's `?` to the JSON.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helpDir = path.join(root, 'public', 'help');
const srcDir = path.join(root, 'src');

const problems = [];
const fail = (message) => problems.push(message);

const readJson = (file, label) => {
  let text;

  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    fail(`${label}: ফাইল পাওয়া যায়নি (${path.relative(root, file)})`);
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label}: JSON ভাঙা — ${error.message}`);
    return null;
  }
};

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

/* -- every JSON in the folder must at least parse -------------------------- */

let helpFiles = [];

try {
  helpFiles = fs.readdirSync(helpDir).filter((name) => name.toLowerCase().endsWith('.json'));
} catch {
  fail('public/help/ ফোল্ডার পাওয়া যায়নি');
}

for (const name of helpFiles) {
  readJson(path.join(helpDir, name), `public/help/${name}`);
}

/* -- the index, and the module files it names ------------------------------ */

const index = readJson(path.join(helpDir, 'index.json'), 'public/help/index.json');
const knownTopics = new Set();

if (index) {
  if (!Array.isArray(index.modules) || index.modules.length === 0) {
    fail('public/help/index.json: "modules" তালিকা নেই বা খালি');
  } else {
    index.modules.forEach((entry, position) => {
      const where = `index.json modules[${position}]`;

      if (!isObject(entry)) {
        fail(`${where}: একটি বস্তু নয়`);
        return;
      }

      for (const field of ['id', 'title', 'file']) {
        if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
          fail(`${where}: "${field}" নেই`);
        }
      }

      if (typeof entry.file !== 'string' || entry.file.trim() === '') return;

      const moduleFile = path.join(helpDir, entry.file);
      const moduleTopics = readJson(moduleFile, `public/help/${entry.file}`);

      if (!moduleTopics) return;

      if (!isObject(moduleTopics) || Object.keys(moduleTopics).length === 0) {
        fail(`public/help/${entry.file}: কোনো বিষয় নেই`);
        return;
      }

      const indexed = Array.isArray(entry.topics) ? entry.topics : [];

      Object.entries(moduleTopics).forEach(([topicId, topic]) => {
        knownTopics.add(topicId);

        if (!isObject(topic)) {
          fail(`${entry.file} → ${topicId}: একটি বস্তু নয়`);
          return;
        }

        for (const field of ['title', 'module']) {
          if (typeof topic[field] !== 'string' || topic[field].trim() === '') {
            fail(`${entry.file} → ${topicId}: "${field}" নেই`);
          }
        }

        if (!Array.isArray(topic.sections) || topic.sections.length === 0) {
          fail(`${entry.file} → ${topicId}: "sections" নেই বা খালি`);
          return;
        }

        topic.sections.forEach((section, sectionIndex) => {
          if (!isObject(section)) {
            fail(`${entry.file} → ${topicId} sections[${sectionIndex}]: একটি বস্তু নয়`);
            return;
          }

          if (typeof section.heading !== 'string' || section.heading.trim() === '') {
            fail(`${entry.file} → ${topicId} sections[${sectionIndex}]: "heading" নেই`);
          }
        });
      });

      const fileTopics = Object.keys(moduleTopics);

      fileTopics
        .filter((topicId) => !indexed.includes(topicId))
        .forEach((topicId) => fail(`index.json: "${topicId}" ${entry.file}-এ আছে, কিন্তু index-এ নেই`));

      indexed
        .filter((topicId) => !fileTopics.includes(topicId))
        .forEach((topicId) => fail(`index.json: "${topicId}" index-এ আছে, কিন্তু ${entry.file}-এ নেই`));
    });
  }
}

/* -- every HelpButton / openHelp in src must name a real topic -------------- */

const sourceFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;

    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      sourceFiles.push(full);
    }
  }
};

if (fs.existsSync(srcDir)) walk(srcDir);

const references = [];
const patterns = [
  /<HelpButton\s+topic=["']([^"']+)["']/g,
  /\bopenHelp\(\s*["']([^"']+)["']\s*\)/g,
  // A screen that shares its route with other variants names its own topic.
  /helpTopic=["']([^"']+)["']/g,
];

for (const file of sourceFiles) {
  // Comments explain the API and quote example calls; only real calls count.
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      references.push({ topic: match[1], file: path.relative(root, file) });
    }
  }
}

// A route-map entry is a real way in too: the layout renders the one dialog
// for these routes instead of each screen placing its own button.
const routeMapFile = path.join(srcDir, 'components', 'help', 'helpTopicForPath.ts');

if (fs.existsSync(routeMapFile)) {
  const mapText = fs.readFileSync(routeMapFile, 'utf8');

  // One entry per line, so a quoted pair inside the function body is not read
  // as a map entry.
  for (const match of mapText.matchAll(/^\s*'([^']+)':\s*'([^']+)',?\s*$/gm)) {
    references.push({ topic: match[2], file: 'src/components/help/helpTopicForPath.ts' });
  }
}

for (const reference of references) {
  if (!knownTopics.has(reference.topic)) {
    fail(`${reference.file}: "${reference.topic}" নামে কোনো বিষয় public/help/-এ নেই`);
  }
}

/* -- the coverage document -------------------------------------------------- */

/* -- Sales and Purchase variants ------------------------------------------- */

/**
 * One route renders several forms, chosen by the branch's business type. Each
 * form names its own topic, and the route map is only a fallback -- so these
 * rows are exempt from the route-map equality check above.
 */
const VARIANT_TOPICS = new Set([
  'sales-general',
  'sales-trading',
  'sales-tiles',
  'sales-electronics',
  'sales-company-scheme',
  'sales-return-general',
  'sales-return-tiles',
  'sales-import-trading',
  'combined-trading',
  'combined-tiles',
  'purchase-trading',
  'purchase-construction',
  'purchase-tiles',
  'purchase-electronics',
  'purchase-return-construction',
  'purchase-return-tiles',
  'purchase-import-trading',
  'delivery',
  'labour-invoice',
]);

const coveragePath = path.join(root, 'docs', 'help-coverage.md');
const appSource = fs.readFileSync(path.join(srcDir, 'App.tsx'), 'utf8');
const routesSource = fs.readFileSync(
  path.join(srcDir, 'components', 'services', 'appRoutes.tsx'),
  'utf8',
);

const routePaths = new Map();

for (const match of routesSource.matchAll(/^\s*([A-Za-z0-9_]+):\s*['"]([^'"]+)['"]/gm)) {
  routePaths.set(match[1], match[2]);
}

const routesInApp = new Set();

for (const match of appSource.matchAll(/path=\{routes\.([A-Za-z0-9_]+)\}/g)) {
  const route = routePaths.get(match[1]);
  if (route) routesInApp.add(route);
}

for (const match of appSource.matchAll(/path=\{?['"]([^'"]+)['"]\}?/g)) {
  routesInApp.add(match[1]);
}

let coverage = '';

try {
  coverage = fs.readFileSync(coveragePath, 'utf8');
} catch {
  fail('docs/help-coverage.md ফাইল নেই');
}

/* -- route -> screen file, and its title row ------------------------------- */

const routeMapEntries = [];

if (fs.existsSync(routeMapFile)) {
  const mapText = fs.readFileSync(routeMapFile, 'utf8');

  for (const match of mapText.matchAll(/^\s*'([^']+)':\s*'([^']+)',?\s*$/gm)) {
    routeMapEntries.push({ pattern: match[1], topic: match[2] });
  }
}

const topicForRoute = (route) => {
  const exact = routeMapEntries.find((entry) => entry.pattern === route);

  if (exact) return exact.topic;

  const segments = route.split('/').filter(Boolean);

  for (const entry of routeMapEntries) {
    if (!entry.pattern.includes(':')) continue;

    const parts = entry.pattern.split('/').filter(Boolean);

    if (
      parts.length === segments.length &&
      parts.every((part, index) => part.startsWith(':') || part === segments[index])
    ) {
      return entry.topic;
    }
  }

  return null;
};

// App.tsx imports every routed screen by name; resolve those names to files.
const importFiles = new Map();

for (const match of appSource.matchAll(/^import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"]/gm)) {
  const [, name, specifier] = match;
  const base = specifier.startsWith('@/')
    ? path.join(srcDir, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(path.join(srcDir, 'App.tsx')), specifier)
      : null;

  if (!base) continue;

  for (const candidate of [base, base + '.tsx', base + '.ts', path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      importFiles.set(name, candidate);
      break;
    }
  }
}

const routeComponents = new Map();

for (const match of appSource.matchAll(/<Route\s+path=\{routes\.([A-Za-z0-9_]+)\}[^>]*?element=\{<([A-Za-z0-9_]+)/g)) {
  const route = routePaths.get(match[1]);
  if (route) routeComponents.set(route, match[2]);
}

for (const match of appSource.matchAll(/<Route\s+path=\{?['"]([^'"]+)['"]\}?[^>]*?element=\{<([A-Za-z0-9_]+)/g)) {
  // "/" also mounts the layout itself; the page inside it is the screen.
  if (match[2] === 'DefaultLayout') continue;
  routeComponents.set(match[1], match[2]);
}

// A scene renders the title itself. An *Index wrapper (BankPaymentIndex) is
// the one exception: it hands the screen to the form below it, so the title is
// one import down. These thin screens only choose a variant of the shared form,
// and that form renders the title and the `?`.
const titleDelegates = new Set([
  'NegativeStockProducts',
  'SlowMovingProducts',
  'WarehouseDifferenceProducts',
  'SmsTemplateCreate',
  'SmsTemplateEdit',
]);

const rendersHelmetTitle = (file, allowOneImport = false) => {
  if (!file || !fs.existsSync(file)) return false;

  const text = fs.readFileSync(file, 'utf8');

  if (text.includes('<HelmetTitle')) return true;
  if (!allowOneImport) return false;

  for (const match of text.matchAll(/^import\s+[A-Za-z0-9_,{}\s]+\s+from\s+['"](\.[^'"]+)['"]/gm)) {
    const base = path.resolve(path.dirname(file), match[1]);

    for (const candidate of [base, base + '.tsx', base + '.ts', path.join(base, 'index.tsx')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        if (fs.readFileSync(candidate, 'utf8').includes('<HelmetTitle')) return true;
        break;
      }
    }
  }

  return false;
};

/* -- the coverage document -------------------------------------------------- */

if (coverage) {
  for (const route of routesInApp) {
    if (!coverage.includes('`' + route + '`')) {
      fail(`docs/help-coverage.md: route "${route}" নেই`);
    }
  }

  for (const match of coverage.matchAll(/^\|[^|]*\|[^|]*\| `([^`]+)` \| `([^`]+)` \| done \|$/gm)) {
    const [, route, topic] = match;

    if (!knownTopics.has(topic)) {
      fail(`docs/help-coverage.md: ${route} done, কিন্তু "${topic}" বিষয়টি নেই`);
    } else if (!references.some((reference) => reference.topic === topic)) {
      fail(
        `docs/help-coverage.md: ${route} done, কিন্তু "${topic}"-এর HelpButton / openHelp / route-map নেই`,
      );
    }

    const routed = topicForRoute(route);

    if (!routed) {
      fail(`docs/help-coverage.md: ${route} done, কিন্তু helpTopicForPath.ts-এ এর topic নেই`);
    } else if (routed !== topic && !VARIANT_TOPICS.has(topic)) {
      fail(
        `docs/help-coverage.md: ${route}-এর topic "${topic}", কিন্তু helpTopicForPath.ts বলে "${routed}"`,
      );
    }

    const component = routeComponents.get(route);

    if (!component) {
      fail(`docs/help-coverage.md: ${route} done, কিন্তু App.tsx-এ এর screen মেলেনি`);
    } else if (
      !rendersHelmetTitle(
        importFiles.get(component),
        /Index$/.test(component) || titleDelegates.has(component),
      )
    ) {
      fail(
        `docs/help-coverage.md: ${route} done, কিন্তু ${component}-এ HelmetTitle নেই — title-এর পাশে ? আসবে না`,
      );
    }
  }
}

/* -- every sidebar link is in the Help menu -------------------------------- */

const sidebarFile = path.join(srcDir, 'components', 'Sidebar', 'index.tsx');
const helpPageFile = path.join(srcDir, 'components', 'help', 'HelpPage.tsx');

if (fs.existsSync(sidebarFile) && fs.existsSync(helpPageFile)) {
  const sidebarSource = fs.readFileSync(sidebarFile, 'utf8');
  const helpPageSource = fs.readFileSync(helpPageFile, 'utf8');

  // The Help menu is not a second list: it draws the sidebar's own definitions.
  for (const name of ['SIDEBAR_MENUS', 'SIDEBAR_SUBMENUS', 'SIDEBAR_MENU_ICONS']) {
    if (!helpPageSource.includes(name)) {
      fail(`HelpPage.tsx: Sidebar-এর ${name} ব্যবহার করা হয়নি — মেনু মিলবে না`);
    }
  }

  const start = sidebarSource.indexOf('export const SIDEBAR_SUBMENUS');
  const end = sidebarSource.indexOf('export const SIDEBAR_MENUS');
  const block = start >= 0 && end > start ? sidebarSource.slice(start, end) : '';
  const ids = [...block.matchAll(/\{\s*id:\s*'([^']+)',\s*title:/g)].map((match) => match[1]);

  for (const id of [...ids, 'reseller', 'customer_dashboard', 'help']) {
    // The Help menu's own link is this page; it has no help topic of its own.
    if (id === 'help') continue;

    const route =
      id === 'admin/check-register'
        ? '/admin/unit-payment-list'
        : id === 'reseller'
          ? routePaths.get('reseller_dashboard')
          : id === 'customer_dashboard'
            ? '/customer-dashboard'
            : routePaths.get(id) ?? (id.startsWith('/') ? id : '/' + id);

    if (!route) {
      fail(`Sidebar "${id}": route পাওয়া যায়নি — Help মেনুতে বসানো যাবে না`);
      continue;
    }

    if (!topicForRoute(route)) {
      fail(`Sidebar "${id}" (${route})-এর Help topic নেই — Help মেনুতে এর লেখা আসবে না`);
    }
  }

  // Every form behind a shared Sales/Purchase route names its own topic.
  const invoiceScreens = {
    'components/modules/invoices/sales/GeneralBusinessSales.tsx': 'sales-general',
    'components/modules/invoices/sales/TradingBusinessSales.tsx': 'sales-trading',
    'components/modules/invoices/sales/TilesBusinessSales.tsx': 'sales-tiles',
    'components/modules/invoices/sales/ElectronicsBusinessSales.tsx': 'sales-electronics',
    'components/modules/invoices/sales/CompanySchemeSales.tsx': 'sales-company-scheme',
    'components/modules/invoices/sales/GeneralBusinessSalesReturn.tsx': 'sales-return-general',
    'components/modules/invoices/sales/TilesBusinessSalesReturn.tsx': 'sales-return-tiles',
    'components/modules/invoices/sales/TradingSalesImport.tsx': 'sales-import-trading',
    'components/modules/invoices/trading/TradingCombinedEntry.tsx': 'combined-trading',
    'components/modules/invoices/tiles/TilesCombinedEntry.tsx': 'combined-tiles',
    'components/modules/invoices/purchase/TradingBusinessPurchase.tsx': 'purchase-trading',
    'components/modules/invoices/purchase/ConstructionBusinessPurchase.tsx': 'purchase-construction',
    'components/modules/invoices/purchase/TilesBusinessPurchase.tsx': 'purchase-tiles',
    'components/modules/invoices/purchase/ElectronicsBusinessPurchase.tsx': 'purchase-electronics',
    'components/modules/invoices/purchase/ConstructionBusinessPurchaseReturn.tsx':
      'purchase-return-construction',
    'components/modules/invoices/purchase/TilesBusinessPurchaseReturn.tsx': 'purchase-return-tiles',
    'components/modules/invoices/purchase/TradingPurchaseImport.tsx': 'purchase-import-trading',
    'components/modules/delivery/Delivery.tsx': 'delivery',
    'components/modules/invoices/labour/ConstructionLabourInvoice.tsx': 'labour-invoice',
  };

  for (const [file, topic] of Object.entries(invoiceScreens)) {
    const full = path.join(srcDir, file);

    if (!fs.existsSync(full)) {
      fail(`${file}: ফাইল পাওয়া যায়নি — "${topic}" যাচাই করা যায়নি`);
      continue;
    }

    const text = fs.readFileSync(full, 'utf8');

    if (!text.includes(`helpTopic="${topic}"`)) {
      fail(`${file}: helpTopic="${topic}" নেই — নিজের Help খুলবে না`);
    }

    if (!knownTopics.has(topic)) {
      fail(`${file}: "${topic}" বিষয়টি public/help/-এ নেই`);
    }
  }

  // And the Help menu must offer every one of them, under Sales or Purchase.
  for (const topic of VARIANT_TOPICS) {
    if (!helpPageSource.includes(`'${topic}'`)) {
      fail(`HelpPage.tsx: "${topic}" Sales/Purchase মেনুতে নেই`);
    }
  }
}

/* -- report ---------------------------------------------------------------- */

if (problems.length > 0) {
  console.error(`\nHelp যাচাই ব্যর্থ — ${problems.length}টি সমস্যা:\n`);
  problems.forEach((problem) => console.error('  ✗ ' + problem));
  console.error('\nঠিক করে আবার চালান: npm run help:check\n');
  process.exit(1);
}

console.log(
  `Help যাচাই ঠিক আছে — ${knownTopics.size}টি বিষয়, ${helpFiles.length}টি JSON ফাইল, ` +
    `${references.length}টি স্ক্রিন-সংযোগ।`,
);
