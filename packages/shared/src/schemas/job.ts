import { z } from 'zod'

export const platformSchema = z.enum(['linkedin', 'indeed', 'greenhouse', 'manual', 'unknown'])

export const jobRequirementsSchema = z.object({
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  requiredYearsExperience: z.number().nullable(),
  requiredEducation: z.string().nullable(),
  responsibilities: z.array(z.string()),
  niceToHave: z.array(z.string()),
  keywords: z.array(z.string()),
  inferredTitle: z.string().optional(),
  inferredCompany: z.string().optional(),
})

export const jobExtractionSchema = z.object({
  rawDescription: z.string().min(100).max(50000),
  sourceUrl: z.string().min(1),
})

export const analyzeSchema = z.object({
  cvId: z.string().uuid(),
  jobId: z.string().uuid(),
})
