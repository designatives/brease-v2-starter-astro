import { defineConfig, fontProviders } from 'astro/config'

import { breaseRedirects } from './scripts/redirects.mjs'

// Static output: every page is built from Brease content, and a release rebuilds the site. Pages are files
// (/about → about.html) so their URLs match Brease's, with no trailing slash.
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-sans',
      subsets: ['latin', 'latin-ext'],
    },
  ],
  integrations: [breaseRedirects()],
})
