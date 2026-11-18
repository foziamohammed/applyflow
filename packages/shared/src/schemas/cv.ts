import { z } from 'zod'

export const educationEntrySchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().nullable(),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  gpa: z.string().nullable(),
})

export const experienceEntrySchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  current: z.boolean(),
  bullets: z.array(z.string()),
})

export const projectEntrySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  technologies: z.array(z.string()),
  url: z.string().url().nullable(),
})

export const parsedCVProfileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().nullable(),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
  education: z.array(educationEntrySchema),
  experience: z.array(experienceEntrySchema),
  projects: z.array(projectEntrySchema),
  certifications: z.array(z.string()),
})

export const tailorCVSchema = z.object({
  cvId: z.string().uuid(),
  jobId: z.string().uuid(),
  analysisId: z.string().uuid(),
})

export const cvChangeSchema = z.object({
  section: z.enum(['summary', 'skills', 'experience', 'projects']),
  changeType: z.enum(['reorder', 'rewrite', 'omit', 'emphasize']),
  rationale: z.string(),
})

export const tailoredCVContentSchema = z.object({
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(experienceEntrySchema),
  projects: z.array(projectEntrySchema),
  education: z.array(educationEntrySchema),
  changeLog: z.array(cvChangeSchema).min(1),
})
