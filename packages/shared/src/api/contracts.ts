import { z } from 'zod'
import {
  registerSchema,
  loginSchema,
  profileSchema,
} from '../schemas/user.js'
import {
  jobExtractionSchema,
  analyzeSchema,
} from '../schemas/job.js'
import {
  tailorCVSchema,
  parsedCVProfileSchema,
} from '../schemas/cv.js'
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
  generateAnswersSchema,
} from '../schemas/application.js'

// Auth contracts
export type RegisterRequest = z.infer<typeof registerSchema>
export type LoginRequest = z.infer<typeof loginSchema>
export type AuthResponse = { accessToken: string; userId: string }

// Profile contracts
export type UpdateProfileRequest = z.infer<typeof profileSchema>

// Job contracts
export type ExtractJobRequest = z.infer<typeof jobExtractionSchema>
export type AnalyzeRequest = z.infer<typeof analyzeSchema>

// CV contracts
export type TailorCVRequest = z.infer<typeof tailorCVSchema>
export type ParsedCVProfileRequest = z.infer<typeof parsedCVProfileSchema>

// Application contracts
export type CreateApplicationRequest = z.infer<typeof createApplicationSchema>
export type UpdateApplicationStatusRequest = z.infer<typeof updateApplicationStatusSchema>
export type GenerateAnswersRequest = z.infer<typeof generateAnswersSchema>

// Pagination
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Error response
export interface APIError {
  error: string
  message?: string
  details?: unknown
}
