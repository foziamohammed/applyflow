import { defineConfig } from 'wxt'

export default defineConfig({
  extensionEntrypoints: {},
  manifest: {
    name: 'ApplyFlow',
    description: 'AI-powered job application assistant',
    version: '0.1.0',
    permissions: ['storage', 'scripting', 'sidePanel', 'tabs'],
    host_permissions: [
      'https://www.linkedin.com/jobs/*',
      'https://linkedin.com/jobs/*',
      'https://www.indeed.com/viewjob*',
      'https://indeed.com/viewjob*',
      'https://boards.greenhouse.io/*',
      'http://localhost:3001/*',
    ],
    action: {},
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
  imports: false,
})
