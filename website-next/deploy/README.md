# Deploying the Next.js websites

> ⚠️ **Nothing here has been applied.** No production routing, DNS or server
> change has been made. This is the staged plan, and it is applied to **staging
> first**. Do not enable it for a tenant until that tenant's local and staging
> tests pass.

---

## 1. URL mapping (the decision to review first)

A website belongs to exactly one `company_id` in its installation's database
(`site_sites.company_id` is UNIQUE). A public request is mapped to a company by
**host alone**, in two explicit rules:

1. a **verified custom domain** on the site row (exact host match), or
2. **`<subdomain>.<SITE_DOMAIN>`** — the host's single label against the site's
   stored `subdomain` (UNIQUE per database).

There is **no** "only one site, so it must be this one" rule. The resolver was
changed to remove it (`app/Services/Site/SiteResolver.php`): a count-based
fallback would let one host answer for whichever company happened to be alone,
which is a cross-company leak in a multi-company database.

### Per-tenant installation (one company per database)

| What | Host | How it resolves |
| --- | --- | --- |
| Public website | `https://aft.cashbookbd.com/` | rule 2 — stored `subdomain` = `aft` (the install's own label) |
| Admin / app | same host | `/login`, `/accounts/*`, `/site/*`, `/api/*`, `/up` |

`/` is the website when published, otherwise it redirects to `/login` — exactly
as before. This is unchanged behaviour; the tenant's site simply stores the
installation's own host label as its subdomain.

### Multi-company installation (`my.cashbookbd.com`, database `myappsaasdatabase`)

**Proposed: one subdomain per company.**

| What | Host | How it resolves |
| --- | --- | --- |
| Company A website | `https://<company-a-slug>.cashbookbd.com/` | rule 2 — `site_sites.subdomain` = `company-a-slug` |
| Company B website | `https://<company-b-slug>.cashbookbd.com/` | rule 2 — `site_sites.subdomain` = `company-b-slug` |
| Optional custom domain | `https://www.company-a.com/` | rule 1 — verified `custom_domain` |
| Admin / app (all companies) | `https://my.cashbookbd.com/` | `my` is a reserved label; it never serves a company site |

Why this shape:

- `site_sites.subdomain` is already UNIQUE, so the mapping cannot be ambiguous or
  collide between companies.
- It is the same rule the per-tenant fleet already uses — one resolver, one
  mental model.
- Custom domains keep working for companies that want their own domain.
- The install's own host (`my.…`) stays reserved for the admin app, so a company
  can never accidentally claim it.

**What this needs that does not exist yet:** a wildcard DNS record /
reverse-proxy entry sending `*.<SITE_DOMAIN>` to the multi-company installation,
or a per-company DNS entry. That is a **DNS/routing change and is NOT made here.**
Until it exists, a company in the multi-company database is reachable in the
builder's preview but has no public host.

**Alternative considered and rejected:** path-based
`my.cashbookbd.com/sites/<slug>/…`. It collides with the application's own paths,
breaks canonical URLs and the app/site split in nginx, and makes robots/sitemap
per-company harder. Not recommended.

---

## 2. Build

One Next.js build per release (runtime env differs per tenant — unlike the Vite
SPA, whose API URL is baked in at build time).

```bash
cd website-next
npm ci
npm run build          # output: 'standalone'
```

The deployable bundle is:

- `.next/standalone/`  (server + minimal node_modules)
- `.next/static/`      (copied to `.next/standalone/.next/static`)
- `public/`            (copied to `.next/standalone/public`)

Laravel needs no schema change. `php artisan site:install-schema` remains the
idempotent per-tenant website-schema installer (six `site_*` tables + five
`site.*` permissions) and has already been run.

---

## 3. Hosting per tenant

One Node process per tenant install (its own env, own port), started by systemd:
[`systemd/tenant-website-next.service`](systemd/tenant-website-next.service).

Per-tenant env (`website-next/.env.production`), see
[`env/.env.production.example`](env/.env.production.example):

```
PORT=3100
SITE_HOST=aft.cashbookbd.com
LARAVEL_INTERNAL_URL=http://127.0.0.1:8123
REVALIDATE_SECRET=<random>
```

`LARAVEL_INTERNAL_URL` points at that tenant's own Laravel, so a process only
ever talks to its own database. Port = `3100 + <tenant offset>` from the deploy
map.

For the multi-company install the same unit is used once, at
`my.cashbookbd.com`, and it serves every company's subdomain via rule 2.

---

## 4. Reverse proxy (nginx / CloudPanel)

Per tenant vhost. The snippets are [`nginx/tenant-phase1.conf`](nginx/tenant-phase1.conf)
(public site only) and [`nginx/tenant-phase2.conf`](nginx/tenant-phase2.conf)
(builder included). The builder stays on Blade until Phase 2.

Key points, in order of precedence:

- `/api/`, `/sanctum/`, `/login`, `/up`, `/accounts/`, the app module prefixes
  and static assets go to **Laravel** (php-fpm).
- `^~ /site_media/` must be declared **before** `^~ /site` so it is not captured
  when `/site` moves to Next.js in Phase 2. Longest `^~` prefix wins.
- `/site` and the public paths (`/`, `/products*`, `/contact`, `/[slug]`,
  `/sitemap.xml`, `/robots.txt`) go to **Next.js**.
- Every `proxy_pass` sets `Host` and `X-Site-Host` so the SSR fetch resolves the
  right company.

For the multi-company install, add one `server_name` per company subdomain (or a
wildcard `*.cashbookbd.com`) pointing at the single Next.js upstream, plus the
same path split.

---

## 5. Staging first

1. Deploy Laravel (API only). No routing change; nothing user-visible.
2. Deploy the Next.js process on `staging.cashbookbd.com`.
3. Apply `tenant-phase1.conf` on staging. Verify: public pages, sitemap, robots,
   contact, product privacy, and that `/login`, `/accounts/*`, `/site/*` still
   reach Laravel.
4. Apply `tenant-phase2.conf` on staging (builder in Next.js). Verify the builder
   E2E suite.
5. Only then roll the same two steps to each tenant, one at a time.

---

## 6. CI

`.github/workflows/website-next.yml` is **manual-only** (`workflow_dispatch`): it
builds, uploads the standalone artifact, and — when a tenant is chosen — restarts
that tenant's unit and reloads nginx. It never runs on push, so it cannot deploy
anything by itself.
