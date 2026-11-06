# BREASE.md

Rules for editing this site with Brease. Keep them when you change templates.

## Stack
- Astro 7, TypeScript, pnpm. Static output: every page is built from Brease content at build time and deployed as files. No CMS or database in the repo: all editable content comes from Brease through `brease-client`.
- Hosting: Cloudflare Workers static assets (`wrangler.jsonc`, no Worker code). Built pages are files (`/about` → `about.html`, `build.format: 'file'`), so URLs match Brease's, with no trailing slash.
- Styling: one global stylesheet, `src/styles.css` (design tokens in `:root`). Font: Inter through Astro's font API (`fonts` in `astro.config.mjs`, `<Font>` in the layout), used through `--sans`.
- No client-side JavaScript: components are `.astro` files that render to HTML.

## Where content is read
The site follows brease-client's "Recommended structure": one catch-all route serves every page in every locale, and locales are a Brease setting, not code. Don't add `[locale]` or `[slug]` routes.

- `src/lib/brease.ts`: the client and the loaders `getPage(slug, locale)`, `getGlobal(locale)` (`{ pageId, content }`), `getLinks(navigationKey, locale)`, `localeOf(path)`. A build asks once per argument; the dev server always asks again.
- `src/pages/[...path].astro`: every page in every locale. `getStaticPaths()` lists them with `brease.routes()`; `brease.route()` gives a path's locale and slug, the page's `content.template` picks the template from `src/brease/templates/`. Slugs starting with `_` are never routed. `prerender = !import.meta.env.DEV` keeps it static in builds while the dev server (the editor's preview) renders each request, so pages added in the editor show without a restart. Keep that line.
- `src/layouts/Layout.astro`: `<html lang>`, the head (`breaseHead(page.resolvedSeo)`: title, meta, canonical, hreflang, Open Graph, structured data and custom code from Brease, already final: no title template or home-page exception in code), site defaults, the font, the GA4 tag (`ga4Html(site)`, only when it's on in Brease; consent starts denied until a cookie banner calls `grantAnalytics()`), header and footer.
- `src/brease/templates/`: one component per page template, mapped in `index.ts`. Add a template there, in `src/lib/content.ts` and in `content.schema.json` together.
- `src/brease/sections/`: the section types a page can hold (see Sections).
- `src/components/LocaleMenu.astro`: the locale selector in the header; it shows only when more than one locale has content. Locale context (`LocaleContext` from brease-client) is passed as props.
- `scripts/redirects.mjs`: at the end of a build, writes `dist/_redirects` (applied by Cloudflare): the redirects managed in Brease, then other forms of each page's URL to its canonical one (`canonicalPath`). Cloudflare allows 2,000 static and 100 dynamic redirects.
- `src/pages/sitemap.xml.ts` (`brease.sitemap(site.url)`), `src/pages/robots.txt.ts`, `src/pages/404.astro`.

## Content model
| Page (id) | Slug | Template | Holds |
|---|---|---|---|
| `pg_home` | `""` | `home` | `sections`: `hero`, `features`, `closing` |
| `pg_about` | `about` | `page` | `title`, `sections`: `text` |
| `pg_contact` | `contact` | `page` | same as About |
| `pg_global` | `_global` | `global` | `siteName`, `footer` (text, copyright) |

- New simple pages use the `page` template. A page that needs its own layout gets a new template.
- The `page` template's `title` is a fixed field outside the list and renders as the page's `<h1>`.
- `_global` is not `hidden` on purpose (the delivery API answers 404 for hidden pages); it carries `robots: noindex` and is never routed. `getGlobal()` returns empty defaults, so the site renders before it exists. It has no sections.
- Navigation `main` (header) and `footer` link to pages by `pageId`, so their URLs follow each locale.

## Sections
`home` and `page` render `content.sections`: one list `[{ "id": "sec_…", "type": "<folder>", ...fields }]`, with the same ids, order and types in every locale of a page. `id` and `type` are reserved keys.

- `src/brease/sections/<type>/` per section type: its component and `section.json` (`name`, `description`, optional `addable`, and `fields`, the JSON Schema of the section's own fields). Add a type by adding a folder, its type in `src/lib/content.ts` and its entry in the map.
- `src/brease/sections/Sections.astro`: the type-to-component map, rendering the list in order. A type that isn't in the map renders nothing.
- `content.schema.json` only declares `sections` as a list of `{ id, type }`; Brease adds the per-type schemas from `section.json`.
- Header and footer (from `_global` and the navigations) are site-wide, not sections.

| Type | Name | What it is |
|---|---|---|
| `hero` | Hero | Eyebrow, title, text and a button. Holds the page's `<h1>`: at most one per page, at the top. |
| `features` | Features | A heading over cards, each with a title and a text. |
| `closing` | Call to action | A centered heading, a sentence and a button. |
| `text` | Text | Optional `<h2>` heading, an intro line and an HTML body (`<p>`, `<h2>`, `<h3>`, lists, `<blockquote>`, with `<strong>`, `<em>` and `<a href>` inline). |

## Picker attributes
- `data-brease={fieldPath('<path>')}` (or the plain path) on every element that renders a content value: the JSON path inside the page's `content`, array indices as numbers: `title`, `sections.0.title`, `sections.1.items.2.text`.
- Content read from another page is prefixed with that page's ID, taken from the fetched page, never a fixed one: `fieldPath('siteName', global.pageId)`.
- Navigations: `data-brease={navPath('main')}` and `data-brease={navPath('footer')}` on the elements wrapping their links.
- The element holding the list carries `data-brease-sections="sections"` (`{...sectionsAttrs}`). Each section's root carries `data-brease-section="<id>"` and `data-brease-block="<type>"` (`{...sectionAttrs(section)}`).
- `data-brease-block="Header"` and `data-brease-block="Footer"` on the site-wide parts.

## Publishing
A release rebuilds the site (Brease's content refresh is "redeploy"): the build reads the content released for its commit (`WORKERS_CI_COMMIT_SHA` on Cloudflare, `VERCEL_GIT_COMMIT_SHA` on Vercel) and Cloudflare serves the new files once the build finishes. Redirects take effect with the same build.

## Commands
```sh
pnpm install
cp .env.example .env              # BREASE_TOKEN (and BREASE_API_URL for a local Brease)
pnpm dev
pnpm check && pnpm build
pnpm preview                      # the build, served by Wrangler as on Cloudflare
```
`brease-seed/` is the site's first content. Brease imports it once when the site is set up; after that the content lives in Brease. Inside a Brease sandbox the working copy is `.brease/` (git-ignored, managed by Brease).
