# Brease starter (Astro)

A small website — Home, About, Contact — whose content is edited in [Brease](https://brease.io). It builds to static files, so it runs on Cloudflare's free static hosting.

## Start a site from it

1. In Brease, create a site, pick Cloudflare as the host and choose **Start from scratch** in the GitHub step. It opens GitHub with this template; create the repository.
2. Connect Cloudflare in the next step. Brease sets up the Worker and writes every setting the site needs.
3. Brease imports the first content from `brease-seed/`, and you can edit the site in the Brease editor.

No coding needed. Developers: see `BREASE.md` for the structure and content model.

## Run locally

```sh
pnpm install
cp .env.example .env         # BREASE_TOKEN (and BREASE_API_URL for a local Brease)
pnpm dev                     # live content, re-read on every request
pnpm preview                 # the built site, served the way Cloudflare serves it
```
