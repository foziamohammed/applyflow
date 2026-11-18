import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const profileSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  portfolioUrl: z.string().url().nullable().optional(),
})
