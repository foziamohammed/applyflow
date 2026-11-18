import { z } from 'zod'

export const applicationStatusSchema = z.enum([
  'draft',
  'submitted',
  'interviewing',
  'offered',
  'rejected',
  'withdrawn',
])

export const applicationAnswerSchema = z.object({
  question: z.string().min(1),
  answer: z.string(),
  source: z.enum(['ai-generated', 'user-edited', 'user-written']),
})

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  cvId: z.string().uuid(),
  tailoredCvId: z.string().uuid().nullable().optional(),
  analysisId: z.string().uuid().nullable().optional(),
  status: applicationStatusSchema.optional().default('draft'),
  answers: z.array(applicationAnswerSchema).default([]),
})

export const updateApplicationStatusSchema = z.object({
  status: applicationStatusSchema,
})

export const generateAnswersSchema = z.object({
  jobId: z.string().uuid(),
  cvId: z.string().uuid(),
  questions: z
    .array(z.string().min(1))
    .min(1, 'At least one question is required'),
})
