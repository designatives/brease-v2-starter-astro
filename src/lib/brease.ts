import { createBrease, type LocaleContext, type Page } from 'brease-client'

import type { GlobalContent, PageContent } from './content'

// BREASE_TOKEN / BREASE_API_URL come from the environment. A build on Cloudflare reads the content released
// for its own commit (Vercel's commit is picked up by brease-client itself).
export const brease = createBrease({ commit: process.env.WORKERS_CI_COMMIT_SHA })

// A build asks for the same site, global content and navigations on every page: ask once. The dev server
// (the Brease editor's preview) always asks again, so every edit shows on the next load.
function once<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  if (import.meta.env.DEV) return fn
  const memo = new Map<string, Promise<R>>()
  return (...args: A) => {
    const key = JSON.stringify(args)
    if (!memo.has(key)) memo.set(key, fn(...args))
    return memo.get(key) as Promise<R>
  }
}

/** Locales come from Brease: the route decides a page's locale, nothing here names one. */
export const getSite = once(() => brease.getSite())

/** og:locale form of a locale code: en → en_US, hu → hu_HU. */
export const ogLocale = (locale: string) =>
  new Intl.Locale(locale)
    .maximize()
    .toString()
    .split('-')
    .filter((p, i) => i === 0 || /^[A-Z]{2}$/.test(p))
    .join('_')

/** Slugs starting with "_" hold shared content and are never routed. */
export const isInternalSlug = (slug: string) => slug.startsWith('_')

export async function getPage(slug: string, locale: string): Promise<Page<PageContent> | null> {
  if (isInternalSlug(slug)) return null
  return brease.getPage<PageContent>(slug, { locale })
}

/**
 * Site-wide content, with empty defaults so the site renders before the `_global` page exists; `pageId`
 * (absent until then) prefixes its editor markers.
 */
export const getGlobal = once(
  async (locale: string): Promise<{ pageId?: string; content: GlobalContent }> => {
    const page = await brease.getPage<Partial<GlobalContent>>('_global', { locale })
    return {
      pageId: page?.pageId,
      content: {
        template: 'global',
        siteName: page?.content.siteName ?? '',
        footer: { text: '', copyright: '', ...page?.content.footer },
      },
    }
  },
)
export type Global = Awaited<ReturnType<typeof getGlobal>>

/** A navigation's links in a locale (`main`: the header, `footer`: the footer). */
export const getLinks = once(async (key: string, locale: string) => {
  const nav = await brease.getNavigation(key, { locale })
  return (nav?.items ?? []).map((i) => ({ label: i.label, href: i.url, target: i.target }))
})
export type NavLink = Awaited<ReturnType<typeof getLinks>>[number]

/** The locale of a path (the default one where no page can live, e.g. the 404 page). */
export async function localeOf(path?: string): Promise<LocaleContext> {
  const [context, site] = await Promise.all([brease.localeContext(path), getSite()])
  return (
    context ?? {
      locale: site.defaultLocale,
      settings: {
        locales: site.locales,
        defaultLocale: site.defaultLocale,
        localeStrategy: site.localeStrategy,
        urlTemplate: site.urlTemplate,
      },
      alternates: {},
      homes: {},
    }
  )
}
