import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/shared',
  'packages/ai',
  'packages/cv-parser',
  'packages/job-analyzer',
  'apps/api',
])
