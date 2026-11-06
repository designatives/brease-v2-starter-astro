import type { APIRoute } from 'astro'

import { brease } from '@/lib/brease'

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

// Pages search may show, in every locale, with hreflang alternates, at the site's public address (site.url).
// Empty before the site has a domain.
export const GET: APIRoute = async () => {
  const site = await brease.getSite()
  const entries = site.url ? await brease.sitemap(site.url) : []
  const urls = entries.map((e) => {
    const alternates = Object.entries(e.alternates)
    const links =
      alternates.length > 1
        ? alternates
            .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${xml(href)}"/>`)
            .join('')
        : ''
    return `<url><loc>${xml(e.url)}</loc>${links}</url>`
  })
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`,
    { headers: { 'content-type': 'application/xml' } },
  )
}
