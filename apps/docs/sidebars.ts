import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  userSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/login-and-workspace',
        'getting-started/dashboard-basics',
        'getting-started/company-and-master-data',
      ],
    },
    {
      type: 'category',
      label: 'Platform',
      items: [
        'platform/workspace-foundation',
      ],
    },
    {
      type: 'category',
      label: 'Entries',
      items: [
        'entries/sales',
        'entries/quotation',
        'entries/purchase',
        'entries/receipt',
        'entries/payment',
        'entries/cash-book',
        'entries/bank-book',
      ],
    },
    {
      type: 'category',
      label: 'Reports',
      items: [
        'reports/customer-statement',
        'reports/quotation-report',
      ],
    },
    {
      type: 'category',
      label: 'Settings',
      items: [
        'settings/company-defaults',
        'settings/document-settings',
      ],
    },
  ],
}

export default sidebars
