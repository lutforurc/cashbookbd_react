# Local end-to-end tests

These specs drive the real browser against the real Laravel install and the real
Next.js renderer. Nothing is mocked.

## 1. Start Laravel

From `F:\All_Database\www\cashbook_api`, seed two tenants and two users (once):

```
php _site_e2e_seed.php
```

Then serve it with the local site domain. `php artisan serve` does not pass the
environment through on Windows, so run PHP's own server:

```
set SITE_DOMAIN=cashbookbd.test
set APP_URL=http://aft.cashbookbd.test
set APP_ENV=local
php -S 127.0.0.1:8123 -t public server.php
```

Seeded logins (company 1):

| account | password | permissions |
| --- | --- | --- |
| `e2e.owner@cashbookbd.test` | `e2e-secret` | privileged (everything) |
| `e2e.viewer@cashbookbd.test` | `e2e-secret` | `site.view` only |

## 2. Start Next.js

From `F:\All_Database\cashbookbd_react\website-next`:

```
set NODE_ENV=development
npm run dev
```

`LARAVEL_INTERNAL_URL`, `NEXT_DEV_PROXY` and — crucially — `SITE_HOST` come from
`.env.development`, which is committed and explicit. `SITE_HOST` names the
company that `localhost:3000` represents (`aft.cashbookbd.test` by default). It
is never inferred from "the first company in the database".

Browsing `http://localhost:3000/` logged out shows that company's **published**
website. `/about`, `/products`, `/contact`, `/sitemap.xml` and `/robots.txt` are
public too. `/login` is the application's login (proxied to Laravel locally), and
only `/site/*` (the builder) requires a session. A site with nothing published is
a public 404 — never a redirect to `/login`.

## 3. Run the specs

```
npx playwright install chromium   # once
npm run test:e2e
```

The config maps `aft.cashbookbd.test`, `bravo.cashbookbd.test` and
`nobody.cashbookbd.test` to the loopback inside Chromium, so every request
carries the real tenant host.

## What is covered

- `public-site.spec.ts` — SSR home/about/products, titles, canonical, OG, sitemap, robots, no cost on the page.
- `isolation.spec.ts` — a page that only one tenant has 404s on the other; an unknown host falls back to the app.
- `contact.spec.ts` — a submission is stored and readable in the builder; a honeypot submission is not stored.
- `builder-login.spec.ts` — sign-in required, owner allowed, view-only user refused a write, wrong password reported.
- `builder-publish.spec.ts` — a draft stays private until published; sections reorder.
- `templates.spec.ts` — the gallery renders both templates, each opens in its own preview, and selecting one changes the draft only until Publish (then the fixture is restored).
- `public-no-login.spec.ts` — localhost:3000 serves the published website logged out; `/login` is the app login.
