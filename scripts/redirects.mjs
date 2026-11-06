import { writeFile } from 'node:fs/promises'

import { canonicalPath, createBrease } from 'brease-client'

// A static site has no server to apply redirects per request, so the build writes them to dist/_redirects,
// which Cloudflare (and Netlify) apply: the redirects managed in Brease, then the other forms of each page's
// URL (/en/about where English is the unprefixed default) to its canonical one. A new redirect takes effect
// with the next release.

// Brease's "/docs/:rest*" is "/docs/*" with ":splat" in the destination.
const rule = (r) => {
  let source = r.source
  let destination = r.destination
  const rest = /:([A-Za-z_][A-Za-z0-9_]*)\*$/.exec(source)
  if (rest) {
    source = source.slice(0, rest.index) + '*'
    destination = destination.replaceAll(`:${rest[1]}*`, ':splat').replaceAll(`:${rest[1]}`, ':splat')
  }
  return { source, destination, status: r.status, dynamic: source.includes(':') || source.includes('*') }
}

export function breaseRedirects() {
  return {
    name: 'brease-redirects',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const brease = createBrease({ commit: process.env.WORKERS_CI_COMMIT_SHA })
        const [site, redirects, pages] = await Promise.all([
          brease.getSite(),
          brease.getRedirects(),
          brease.getPages(),
        ])
        const rules = redirects.map(rule)
        for (const page of pages) {
          const prefix = `/${page.locale}`
          const bare =
            page.url === prefix ? '/' : page.url.startsWith(`${prefix}/`) ? page.url.slice(prefix.length) : page.url
          for (const from of [bare, bare === '/' ? prefix : `${prefix}${bare}`]) {
            if (from !== page.url && canonicalPath(site, from) === page.url)
              rules.push({ source: from, destination: page.url, status: 308, dynamic: false })
          }
        }
        // Cloudflare reads static rules before dynamic ones and caps them at 2,000 and 100.
        const lines = [...rules.filter((r) => !r.dynamic), ...rules.filter((r) => r.dynamic)].map(
          (r) => `${r.source} ${r.destination} ${r.status}`,
        )
        await writeFile(new URL('_redirects', dir), lines.length ? `${lines.join('\n')}\n` : '')
        logger.info(`${lines.length} redirect(s) written to _redirects`)
      },
    },
  }
}
