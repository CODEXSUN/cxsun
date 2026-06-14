import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'Codexsun',
  tagline: 'Software user guides and developer operations documentation',
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
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'userSidebar',
          position: 'left',
          label: 'User Docs',
        },
        {
          type: 'docSidebar',
          docsPluginId: 'devdocs',
          sidebarId: 'devSidebar',
          position: 'left',
          label: 'Dev Docs',
        },
        {
          href: `${process.env.FRONTEND_URL ?? 'http://localhost:6010'}/sa/devdocs`,
          label: 'Super Admin',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Core',
          items: [
            { label: 'Project Overview', to: '/devdocs/core/project-overview' },
            { label: 'Database And Tenancy', to: '/devdocs/core/database-and-tenancy' },
            { label: 'Release And Versioning', to: '/devdocs/core/release-and-versioning' },
          ],
        },
        {
          title: 'User Guides',
          items: [
            { label: 'Sales Entry', to: '/docs/entries/sales' },
            { label: 'Quotation Entry', to: '/docs/entries/quotation' },
            { label: 'Customer Statement', to: '/docs/reports/customer-statement' },
          ],
        },
        {
          title: 'Dev Modules',
          items: [
            { label: 'Tenant', to: '/devdocs/modules/tenant' },
            { label: 'Database Manager', to: '/devdocs/modules/database-manager' },
            { label: 'Agent OS', to: '/devdocs/modules/agent-os' },
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
