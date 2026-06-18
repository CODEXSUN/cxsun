import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'Codexsun',
  tagline: 'Business software user guide',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: process.env.DOCS_PUBLIC_URL ?? 'https://codexsun.com',
  baseUrl: process.env.DOCS_BASE_URL ?? '/',
  organizationName: 'CODEXSUN',
  projectName: 'cxsun',
  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'devdocs',
        path: 'devdocs',
        routeBasePath: 'devdocs',
        sidebarPath: './sidebarsDev.ts',
      },
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Codexsun',
      logo: {
        alt: 'Codexsun',
        src: 'img/logo.svg',
      },
      items: [],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'User Guides',
          items: [
            { label: 'Start Here', to: '/docs/' },
            { label: 'Sales Entry', to: '/docs/entries/sales' },
            { label: 'Purchase Entry', to: '/docs/entries/purchase' },
            { label: 'Quotation Entry', to: '/docs/entries/quotation' },
            { label: 'Customer Statement', to: '/docs/reports/customer-statement' },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} CODEXSUN. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
