import type { APIRoute } from 'astro'

import { getSite } from '@/lib/brease'

export const GET: APIRoute = async () => {
  const url = (await getSite()).url?.replace(/\/+$/, '')
  return new Response(`User-agent: *\nAllow: /\n${url ? `\nSitemap: ${url}/sitemap.xml\n` : ''}`, {
    headers: { 'content-type': 'text/plain' },
  })
}
