import Basic from './Basic.astro'
import Home from './Home.astro'

/** How each page template renders: the `template` field of a page's content picks one. */
export const templates: Record<string, typeof Home | typeof Basic> = { home: Home, page: Basic }
