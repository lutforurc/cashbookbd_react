# ধাপ ১ — Multi-language Foundation (Implementation Plan)

**সোর্স:** `docs/mult-language/multi-language-plan.md` — ধাপ ১ (ভিত্তি)
**স্কোপ:** i18n ভিত্তি + **ভাষা সেটিংস পেজ** (বাংলা চালু/বন্ধ, সোর্স plan §২.৪) + হেডারে ভাষা বদলানো। **কোনো লেবেল এখনো অনুবাদ হবে না** — সব স্ক্রিন আজকের মতো ইংরেজিতেই চলবে।
**বাদ:** ধাপ ১ক (ফন্ট/fonts টেবিল/NikoshBAN), `name_local` কলাম, প্রিন্ট, SMS, HRM বাংলা বেতন শীট (সোর্স plan §১৪) — এগুলো আলাদা plan।
**অবস্থা (24/11/2026):** **সম্পন্ন** — `src/i18n`, `src/locales`, i18next dependency, `runMultiLanguage…` মেথড সবই আছে (`cashbook_api` @ `ed343899`, `cashbookbd_react` `Reseller-ui`)।

---

## ০. যে সিদ্ধান্তগুলো নেওয়া হলো

| বিষয় | সিদ্ধান্ত | কারণ |
|---|---|---|
| Backend | আলাদা রিপো `D:\www\cashbook_api` → **নিচের contract অনুযায়ী** | এখন ওয়ার্কস্পেস থেকে পড়া যায় (24/11/2026)। Frontend API-র উপর নির্ভর করে, তাই contract আগে ঠিক করতে হবে |
| `users.lang` মান | `null \| 'en' \| 'local'` | ভাষা-নিরপেক্ষ। নতুন ভাষা যোগে ইউজারের মান বদলাতে হয় না |
| ভাষা নির্ধারণের ক্রম | ইউজার → শাখার `ui_language` → English | সোর্স plan §২.৩ |
| স্বিচার UI | হেডারে ছোট segmented pill: `EN \| বাংলা` | কোম্পানিতে সর্বোচ্চ English + ১টি local, তাই ড্রপডাউন দরকার নেই |
| স্বিচার কখন দেখাবে | `company.local_language` null হলে **কিছুই render হবে না** | সোর্স plan §৪.২ |
| বাংলা কোথা থেকে চালু হয় | **ভাষা সেটিংস পেজ** — Admin → Settings → Language, `/settings/language`, permission `language.settings` | একটা জায়গা থেকে চালু/বন্ধ; Branch Settings-এ ভাষার ঘর নয় (সোর্স plan §২.৪) |
| পেজের ঘর (ধাপ ১) | বাংলা চালু (কোম্পানি) + শাখা বাছাই করে ডিফল্ট ভাষা, প্রিন্টের ভাষা, অঙ্ক | ফন্ট (১ক) আর "ফর্মে বাংলা নামের ঘর" (ধাপ ৩–৪) পরে একই পেজে যোগ হবে |
| অনুবাদ ফাইল | `en` = `src/locales/en/` (bundled, বাধ্যতামূলক); `bn` = `public/locales/bn/` (runtime fetch) | সোর্স plan §৫.১ — অনুবাদ rebuild ছাড়া বদলানো যাবে |
| Pre-paint | `index.html`-এর inline script-এ `localStorage['ui-lang']` পড়ে `<html lang>` সেট | ভুল ভাষার ফ্ল্যাশ এড়াতে (theme script-এর মতোই) |
| ভাষা state | ছোট redux slice + optimistic update | কোডবেসে সবকিছু redux; API ব্যর্থ হলে rollback |

**ধাপ ১-এর সফলতার মাপকাঠি:** ভাষা সেটিংস থেকে বাংলা চালু/বন্ধ করা যায়; চালু থাকলে ভাষা বদলানো যায়, `<html lang>`/`dir` বদলায়, reload ও পরের লগইনে থাকে, প্রতিটা request-এ `Accept-Language` যায় — এবং ইংরেজি বেছে নিলে অ্যাপ হুবহু আজকের মতো।

---

# পার্ট A — Backend Contract (আলাদা রিপোতে বসাতে হবে)

> এই অংশটা `cashbook_api` রিপোতে করতে হবে। নিচের প্রতিটা পরিবর্তন সোর্স plan §৪.০-এর নিয়ম মানবে: `AddUnitTypeToBuildingUnits`-এ আলাদা idempotent `runMultiLanguage…Schema()` মেথড, নিজের `try/catch`, `Schema::hasTable()`/`hasColumn()` গার্ড, `info`/`warn`-এ ডাটাবেসের নাম, এবং `handle()`-এ আলাদা `try { … } catch (\Throwable $e)` ব্লক।

## A1. `languages` টেবিল (`runMultiLanguageLanguagesSchema()`)

বিদ্যমান `App\Models\Admin\Language` মডেল ও টেবিল আছে — **নতুন টেবিল নয়, কলাম যোগ**। যেগুলো আগেই আছে সেগুলো skip:

| কলাম | ধরন | ডিফল্ট |
|---|---|---|
| `code` | varchar(10), unique | — |
| `name` | varchar(100) | — |
| `native_name` | varchar(100) | — |
| `font_family` | varchar(100), null | null |
| `font_file` | varchar(255), null | null |
| `digits` | enum(`latin`,`native`) | `latin` |
| `direction` | enum(`ltr`,`rtl`) | `ltr` |
| `is_active` | tinyint(1) | 1 |

শুরুর ডাটা (আগে `code` দেখে আছে কি না যাচাই):
`en` / English / English / `ltr` / `latin` / active; `bn` / Bangla / বাংলা / `ltr` / `native` / active.

## A2. কোম্পানি (`runMultiLanguageCompanySchema()`)

- `companies` টেবিলে `local_language` varchar(10), null — `bn` / `ar` / null।
- কোনো ডিফল্ট মান বসানো হবে না (null = শুধু ইংরেজি)।

## A3. `users.lang` (`runMultiLanguageUserLangSchema()`)

- কলামের ডিফল্ট `bn` → `null` (`->default(null)->change()`)।
- **একবারই** সব ইউজারের মান null করা: আগে `meta`/flag টেবিলে চিহ্ন রেখে (`multi_language_user_lang_reset`), চিহ্ন থাকলে skip। এতে deploy-এর পর কেউ নিজে ভাষা বাছলে পরের deploy-এ তা মুছবে না।

## A4. Middleware `SetLocaleFromHeader`

`app/Http/Middleware/SetLocaleFromHeader.php`, `api` group-এ append (negative-value middleware-এর পাশে):

```php
$lang = $request->header('Accept-Language') ?? $request->input('print_lang');
// 'bn-BD,en;q=0.9' → 'bn'; শুধু active languages-এর মধ্যে থাকলে setLocale
if ($lang && Language::where('code', $lang)->where('is_active', 1)->exists()) {
    App::setLocale($lang);
}
```

নিয়ম: অচেনা/নিষ্ক্রিয় ভাষা নীরবে উপেক্ষা, exception নয় — পুরনো ক্লায়েন্ট ভাঙা যাবে না।

## A5. `get-settings` payload বাড়ানো

`POST /api/settings/get-settings` এ যোগ হবে (বিদ্যমান key অপরিবর্তিত):

```jsonc
{
  "company": {
    "local_language": "bn",
    "languages": [
      { "code": "en", "name": "English", "native_name": "English", "direction": "ltr", "digits": "latin" },
      { "code": "bn", "name": "Bangla", "native_name": "বাংলা",  "direction": "ltr", "digits": "native" }
    ]
  },
  "branch": { "ui_language": "en", "print_language": "en", "digit_style": "auto" },
  "user": { "lang": null }
}
```

`branch` = বর্তমান শাখার meta (`ui_language`, `print_language`, `digit_style`); না থাকলে ডিফল্ট `en` / `en` / `auto`।

`languages` = শুধু `is_active`, এবং English সবসময় প্রথমে। `users.lang` আগেই `/api/me` ও `/api/settings`-এ user object-এ আছে — নতুন কিছু লাগবে না।

## A6. নতুন endpoint: `POST /api/user/language`

```
Body: { "lang": "en" | "local" | null }
Auth: Sanctum (শুধু নিজের row)
Response: { "success": true, "data": { "lang": "local" } }
```

- `in:en,local` + null অনুমোদিত, বাকি হলে 422।
- নিজের `users.lang` আপডেট; permission চেক লাগবে না।
- **`/user/user-update` ব্যবহার করবেন না** — সেটা পুরো ইউজার payload আশা করে।

## A7. ভাষা সেটিংস API

```
GET  /api/settings/language?branch_id=5
→ { "local_language": "bn" | null,
    "languages": [ …active, English প্রথমে… ],
    "branch_id": 5,
    "ui_language": "en", "print_language": "en", "digit_style": "auto",
    "has_local_names": false }

POST /api/settings/language
Body: { "local_language": "bn" | null,
        "branch_id": 5,
        "ui_language": "en" | "local",
        "print_language": "en" | "local",
        "digit_style": "auto" | "latin" | "native" }
```

- দুটোই permission `language.settings` চায় (`denyUnlessPermitted`); না থাকলে 403।
- `local_language` → কোম্পানির `local_language`; বাকি তিনটা → `meta($companyId, $branchId, …)`। `branch_id` অবশ্যই নিজের কোম্পানির শাখা।
- `local_language` শুধু active `languages.code` অথবা null; `en` গ্রহণযোগ্য নয় (ইংরেজি সবসময় আছে)।
- বাংলা বন্ধ (`null`) করলে কোনো ডাটা মুছবে না; শাখার meta-ও যেমন আছে থাকবে।
- `has_local_names`: কোনো `name_local` লেখা আছে কি না — ধাপ ১-এ সবসময় `false` (কলাম নেই); পরের ধাপে Local Language বদলানো আটকাতে লাগবে (সোর্স plan §২.৫)।
- **Permission:** `language.settings` যোগ হবে `runMultiLanguagePermissionSchema()`-এ, প্যাচ কমান্ডের বাকি permission যেভাবে যোগ হয় সেই ঘরানায় (আগে আছে কি না দেখে)। শুধু Admin role-এ ডিফল্ট দেওয়া হবে।

## A8. Deploy ধাপ

`php artisan patch:add-unit-type` → সব টেন্যান্ট ডাটাবেসে। দুইবার চালালে সব `skipped … already present`। ছোট/পুরনো ডাটাবেসে টেবিল না থাকলে `warn` দিয়ে এগোবে, থামবে না।

---

# পার্ট B — Frontend

## B1. Dependencies

```bash
npm i i18next@^24 react-i18next@^15 i18next-http-backend@^3
```

## B2. নতুন ফাইল

| ফাইল | কাজ |
|---|---|
| `src/i18n/index.ts` | i18next init — `en` bundled, বাকি `public/locales/{{lng}}/{{ns}}.json` |
| `src/i18n/languages.ts` | `resolveLanguageCode()`, `LangChoice`, `LanguageInfo` টাইপ |
| `src/i18n/currentLanguage.ts` | non-React module store: `getCurrentLanguage()` / `setCurrentLanguage()` (httpService এইটা পড়বে) + `localStorage` persist |
| `src/i18n/applyLanguage.ts` | `<html lang>`, `dir`, `data-lang`, `i18n.changeLanguage()` এক জায়গায় |
| `src/i18n/useLanguage.ts` | redux → resolved code; `setLanguage(choice)` রিটার্ন করে |
| `src/i18n/languageSlice.ts` | `{ choice: 'en' \| 'local' \| null \| undefined }` + `saveLanguage` thunk (POST, ব্যর্থ হলে rollback + toast) |
| `src/components/Header/LanguageSwitcher.tsx` | `EN \| বাংলা` pill |
| `src/components/modules/settings/LanguageSettings.tsx` | ভাষা সেটিংস পেজ (B4ক) |
| `src/locales/en/common.json` | শুরুর key-set (নিচে) |
| `public/locales/bn/common.json` | একই key, বাংলা মান |
| `scripts/check-i18n.mjs` | `npm run i18n:check` |

`src/i18n/index.ts`:

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import enCommon from '../locales/en/common.json';
import { getCurrentLanguage } from './currentLanguage';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: getCurrentLanguage(),
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    resources: { en: { common: enCommon } },
    partialBundledLanguages: true,      // en bundled, বাকিগুলো backend থেকে
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },      // অ্যাপে Suspense boundary নেই
  });

export default i18n;
```

`src/i18n/languages.ts`:

```ts
export type LangChoice = 'en' | 'local' | null | undefined;
export type LanguageInfo = {
  code: string; name: string; native_name: string;
  direction: 'ltr' | 'rtl'; digits: 'latin' | 'native';
};

// কোম্পানির local_language না থাকলে local বেছে নিলেও English-এ ফিরবে
export const resolveLanguageCode = (
  choice: LangChoice,
  branchDefault?: string | null,      // meta ui_language: 'en' | 'local'
  companyLocal?: string | null,       // 'bn' | 'ar' | null
): string => {
  const pick = choice ?? branchDefault ?? null;
  if (pick !== 'local') return 'en';
  return companyLocal && companyLocal !== 'en' ? companyLocal : 'en';
};
```

`src/i18n/applyLanguage.ts`:

```ts
export const applyLanguage = (code: string, info?: LanguageInfo) => {
  setCurrentLanguage(code);
  const root = document.documentElement;
  root.lang = code;
  root.dir = info?.direction === 'rtl' ? 'rtl' : 'ltr';
  root.setAttribute('data-lang', code);
  if (i18n.language !== code) i18n.changeLanguage(code);
};
```

## B3. পুরনো ফাইলে বদল

| ফাইল | বদল |
|---|---|
| `src/main.tsx` | `import './i18n';` (CSS import-গুলোর পরে, `App` import-এর আগে) |
| `index.html` | inline script-এ যোগ: `localStorage['ui-lang']` / `['ui-dir']` পড়ে `document.documentElement.lang` ও `dir` সেট (theme script-এর ভেতরেই) |
| `src/App.tsx` | `useLanguage()` কল — `useUserTheme(...)`-এর ঠিক পরে, শুধু side-effect বসানোর জন্য |
| `src/components/services/httpService.tsx` | request interceptor-এ `config.headers['Accept-Language'] = getCurrentLanguage();` |
| `src/components/services/apiRoutes.tsx` | `export const API_USER_LANGUAGE_URL = \`${API_BASE_URL}/user/language\`;` ও `API_LANGUAGE_SETTINGS_URL = \`${API_BASE_URL}/settings/language\`` |
| `src/components/services/appRoutes.tsx` | `language_settings: '/settings/language'` |
| `src/components/services/tabGroups.ts` | `ADMIN_SETTINGS_TABS`-এ `{ label: 'Language', path: routes.language_settings, permission: 'language.settings' }` |
| `src/App.tsx` | ADMIN_SETTINGS_TABS-এর `RouteTabs`-এর ভিতরে `RequirePermission anyOf={['language.settings']}` দিয়ে route |
| `public/help/settings.json` | ভাষা সেটিংস পেজের হেল্প টপিক; তারপর `npm run help:check` (প্রজেক্টের নিয়ম) |
| `src/store.tsx` | `language: languageReducer` যোগ |
| `src/components/Header/index.tsx` | `<ul>`-এ `<li><LanguageSwitcher /></li>` — `DropdownNotification`-এর **আগে** |
| `package.json` | `"i18n:check": "node scripts/check-i18n.mjs"` |
| `CLAUDE.md` | নিয়ম: স্ক্রিনের লেখা বদলালে অনুবাদ ফাইলও বদলাতে হবে (সোর্স plan §১২) |

**⚠️ `httpService` → `src/i18n/currentLanguage` circular import এড়াতে** ওই ফাইলে শুধু একটি module-level `let` + getter/setter থাকবে — কোনো i18next import নয়।

## B4. `LanguageSwitcher` আচরণ

- `useLanguage()` দেবে: `{ code, setLanguage, options, localCode }`।
- `localCode = settings.data.company.local_language`. **null হলে `return null`** — বাটনই দেখাবে না।
- `options` = `company.languages` থেকে English + ওই local ভাষা; label = `native_name` (English option-এর label `English`)।
- ক্লিক: `setLanguage('en' | 'local')` → optimistic redux → `applyLanguage` তাৎক্ষণিক → background-এ `POST /api/user/language`; ব্যর্থ হলে আগের মান ফিরে আসে + toast।
- Active option হাইলাইট (`bg-[rgb(var(--c-primary))] text-white`), inactive `text-[rgb(var(--c-text-muted))]` — হেডারের বিদ্যমান pill/button ঘরানায়।
- `aria-pressed` + `aria-label` `t('language.label')` থেকে (এটাই `t()`-এর প্রথম ব্যবহার)।

## B4ক. ভাষা সেটিংস পেজ (`LanguageSettings.tsx`)

```
ভাষা সেটিংস
─────────────────────────────────────────────
[■] বাংলা চালু                      ← কোম্পানি (local_language = bn / null)
    বন্ধ থাকলে পুরো সফটওয়্যার ইংরেজিতে চলে।

শাখা: [ PGCB Thakurgaon Sadar ▾ ]   ← শুধু বাংলা চালু থাকলে দেখাবে
সফটওয়্যারের ডিফল্ট ভাষা   ( ) English  ( ) বাংলা
প্রিন্টের ডিফল্ট ভাষা      ( ) English  ( ) বাংলা
অঙ্ক                       ( ) ভাষা অনুযায়ী  ( ) 123  ( ) ১২৩

                                            [ Save ]
```

- লোডে `GET /api/settings/language?branch_id=<বর্তমান শাখা>`; শাখা বদলালে আবার GET।
- Save → `POST`; সফল হলে `settings` (redux) আবার আনা, যাতে হেডারের বোতাম সাথে সাথে আসে/যায় — পেজ reload নয়।
- বাংলা **বন্ধ** করার আগে নিশ্চিতকরণ: "সফটওয়্যার ইংরেজিতে চলবে। কোনো ডাটা মুছবে না।"
- পেজের লেবেল এখনই `t()` দিয়ে, `language.settings.*` key — en ও bn দুটো ফাইলেই (এটা অনুবাদের প্রথম আসল পেজ)।
- স্টাইল বাকি Settings ট্যাবগুলোর মতো (`FormToggleField`, Save বাটন প্যানেলের নিচে)।

## B5. শুরুর locale ফাইল

`src/locales/en/common.json` (অল্প, ইচ্ছাকৃতভাবে):

```json
{
  "language": { "label": "Language", "english": "English", "local": "Local" },
  "common": { "save": "Save", "cancel": "Cancel", "yes": "Yes", "no": "No" }
}
```

`public/locales/bn/common.json` — একই key: `"label": "ভাষা"`, `"save": "সেভ"` ইত্যাদি। বাকি namespace (booking, coa, …) ধাপ ২-৭-এ যোগ হবে।

## B6. `scripts/check-i18n.mjs`

`scripts/check-help.mjs`-এর ঘরানায়, বার্তা বাংলায়:

1. `src/locales/en/*.json` ও `public/locales/*/**.json` বৈধ JSON কি না।
2. `en`-এর প্রতিটা key অন্য ভাষায় আছে কি না → ফাঁকা তালিকা + শতাংশ।
3. `.tsx`-এ `t('…')`-এ ব্যবহৃত key `en` ফাইলে আছে কি না।
4. Exit code 1 শুধু ১ ও ৩ ভাঙলে (২ শুধু রিপোর্ট — অনুবাদ অসম্পূর্ণ থাকা স্বাভাবিক)।

> `.tsx`-এ hardcoded ইংরেজি ধরার কড়া নিয়ম ধাপ ২-এ যোগ হবে, এখন নয়।

---

## C. কাজের ক্রম

1. **Backend contract** (পার্ট A) — ফ্রন্টএন্ডের আগে, কারণ payload-এর আকৃতি এর উপর নির্ভর
2. Dependencies + `src/i18n/*` scaffold + locale ফাইল
3. `main.tsx` / `index.html` / `store.tsx` / `App.tsx` wiring
4. `httpService` Accept-Language + `apiRoutes` constant
5. `LanguageSwitcher` + Header-এ বসানো
6. ভাষা সেটিংস পেজ (B4ক) + route + Settings ট্যাব + হেল্প টপিক
7. `scripts/check-i18n.mjs` + `CLAUDE.md` নিয়ম

প্রতিটা ধাপের পর অ্যাপ চালু থাকবে; কোনো স্ক্রিনের লেখা বদলাবে না।

---

## D. পরীক্ষা

**Frontend (এই রিপো):**

- [ ] `npm run build` — কোনো TS/ESLint ভুল নেই
- [ ] `local_language` null কোম্পানিতে হেডারে কোনো ভাষার বাটন নেই
- [ ] ভাষা সেটিংসে "বাংলা চালু" দিয়ে Save → reload ছাড়াই হেডারে `EN | বাংলা` আসে; বন্ধ করলে চলে যায়
- [ ] বাংলা বন্ধ থাকলে পেজে শুধু মূল সুইচ দেখায়, শাখার ঘরগুলো লুকানো
- [ ] শাখার ডিফল্ট "বাংলা" দিলে নিজে কিছু না বাছা ইউজার (`users.lang` null) লগইনে `lang="bn"` পায়; নিজে English বাছা ইউজার English-এই থাকে
- [ ] অন্য শাখা বাছলে সেই শাখার মান লোড হয়, সেভ শুধু সেই শাখায় যায়
- [ ] `language.settings` permission ছাড়া Settings-এ Language ট্যাব নেই, URL-এ গেলে ঢোকা যায় না
- [ ] বাংলা বাছলে `<html lang="bn">`, English বাছলে `lang="en"`; `dir` সঠিক
- [ ] বদলানোর সাথে সাথে বাটনের active state বদলায়, **পেজ reload হয় না**
- [ ] reload করার পর ভাষা আগের মতোই থাকে (pre-paint script)
- [ ] logout → login করলে DB-র মান ফিরে আসে
- [ ] DevTools Network-এ প্রতিটা request-এ `Accept-Language: bn` (বা `en`) আছে
- [ ] `POST /api/user/language` ব্যর্থ করে দিলে আগের ভাষা ফিরে আসে + toast
- [ ] ইংরেজি বেছে নিলে অ্যাপ হুবহু আজকের মতো দেখায়
- [ ] `npm run i18n:check` — en/bn key মিলে যায়, ভাঙা JSON ধরা পড়ে
- [ ] `npm run help:check` আগের মতোই পাস করে

**Backend (আলাদা রিপো):**

- [ ] `php artisan patch:add-unit-type` দুইবার — দ্বিতীয়বার সব `skipped … already present`
- [ ] ছোট ক্লায়েন্ট ডাটাবেসে `languages` টেবিল না থাকলে patch থামে না, `warn` লেখে
- [ ] deploy-এর পর কোনো ইউজারের `users.lang` নিজে থেকে বদলায় না (`null` হয় একবারই)
- [ ] `get-settings` payload-এ `company.local_language`, `company.languages`, `user.lang` আসে
- [ ] `POST /api/user/language` — `en`/`local`/null গ্রহণ করে, বাকিতে 422
- [ ] `GET/POST /api/settings/language` — permission ছাড়া 403; অন্য কোম্পানির `branch_id`-তে refuse; `local_language: "en"` বা অচেনা কোডে 422
- [ ] বাংলা বন্ধ করলে কোনো টেবিলের ডাটা বা শাখার meta মোছে না
- [ ] `language.settings` permission patch দুইবার চালালেও একটাই সারি
- [ ] `Accept-Language: bn` পাঠালে middlewares `App::getLocale()` = `bn`; অচেনা কোডে exception নয়

---

## E. ইচ্ছাকৃতভাবে বাদ (পরের ধাপ)

ধাপ ১ক (fonts টেবিল, NikoshBAN, Branch Settings Font অংশ, CSS ফন্ট ভ্যারিয়েবল), `name_local` কলাম, `LocalNameInput`/`displayName`, প্রিন্ট ভাষা, SMS, Translations স্ক্রিন, `use_bangla` পুরনো branch toggle-এর পরিবর্তন (`com_branches.use_bangla` ও `bangla` আছে; ধাপ ১ এগুলো পড়বে না, বদলাবেও না)।

**HRM বাংলা বেতন শীট** (সোর্স plan §১৪) এই ভিত্তি ও ধাপ ১ক-এর উপর নির্ভর করে: বাংলা ফন্ট, বাংলা অঙ্ক আর প্রিন্টের ভাষা বাছাই এর পরেই আসবে। ধাপ ১-এ তার জন্য আলাদা কিছু লাগবে না — শুধু পরে `public/locales/bn/hrm.json` (namespace `hrm`) যোগ হবে।
