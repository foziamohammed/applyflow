import type {
  ApplicationAnswer,
  CompatibilityResult,
  JobRequirements,
  ParsedCVProfile,
  TailoredCVContent,
} from '@applyflow/shared'
import {
  jobRequirementsSchema,
  parsedCVProfileSchema,
  tailoredCVContentSchema,
} from '@applyflow/shared'
import { getOpenAIClient } from './client.js'
import { withRetry } from './retry.js'

// ─── 5.2: Extract CV Profile ──────────────────────────────────────────────────

export async function extractCVProfile(rawText: string): Promise<ParsedCVProfile> {
  return withRetry(async () => {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a CV/resume parser. Extract structured profile data from the raw text provided by the user. Return a JSON object matching this schema exactly:
{
  "fullName": string,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "summary": string | null,
  "skills": string[],
  "languages": string[],
  "education": [{ "institution": string, "degree": string, "field": string | null, "startYear": number | null, "endYear": number | null, "gpa": string | null }],
  "experience": [{ "company": string, "title": string, "location": string | null, "startDate": string (YYYY-MM), "endDate": string | null (YYYY-MM), "current": boolean, "bullets": string[] }],
  "projects": [{ "name": string, "description": string, "technologies": string[], "url": string | null }],
  "certifications": string[]
}
If a field cannot be determined from the text, use null for nullable fields or empty arrays for arrays.`,
        },
        {
          role: 'user',
          content: rawText,
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI when extracting CV profile')
    }

    const parsed = JSON.parse(content) as unknown
    return parsedCVProfileSchema.parse(parsed)
  })
}

// ─── 5.3: Extract Job Requirements ───────────────────────────────────────────

export async function extractJobRequirements(
  rawDescription: string
): Promise<JobRequirements> {
  return withRetry(async () => {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a job description analyzer. Extract structured requirements from the job description provided by the user. Return a JSON object matching this schema exactly:
{
  "requiredSkills": string[],
  "preferredSkills": string[],
  "requiredYearsExperience": number | null,
  "requiredEducation": string | null,
  "responsibilities": string[],
  "niceToHave": string[],
  "keywords": string[],
  "inferredTitle": string (optional),
  "inferredCompany": string (optional)
}
Extract keywords that are important terms appearing in the job description relevant for matching.`,
        },
        {
          // Requirement 21.1: user-supplied text goes in the user turn, not system prompt
          role: 'user',
          content: rawDescription,
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI when extracting job requirements')
    }

    const parsed = JSON.parse(content) as unknown
    return jobRequirementsSchema.parse(parsed)
  })
}

// ─── 5.4: Analyze Compatibility (qualitative) ───────────────────────────────

export async function analyzeCompatibility(
  profile: ParsedCVProfile,
  requirements: JobRequirements
): Promise<CompatibilityResult> {
  return withRetry(async () => {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a career advisor. Analyze how well the candidate's profile matches the job requirements. Return a JSON object:
{
  "strengths": string[],       // 3-5 specific strengths where the candidate matches well
  "recommendations": string[]  // 3-5 actionable recommendations for the candidate
}
Be specific and reference actual skills, experiences, and requirements.`,
        },
        {
          role: 'user',
          content: JSON.stringify({ profile, requirements }),
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI when analyzing compatibility')
    }

    const parsed = JSON.parse(content) as { strengths?: string[]; recommendations?: string[] }
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  })
}

// ─── 5.5: Tailor CV ─────────────────────────────────────────────────────────

export async function tailorCV(
  profile: ParsedCVProfile,
  requirements: JobRequirements,
  systemPrompt: string
): Promise<TailoredCVContent> {
  return withRetry(async () => {
    const client = getOpenAIClient()

    // Requirement 20.4: try gpt-4o first, fall back to gpt-4o-mini on context window overflow
    const userContent = JSON.stringify({ profile, requirements })
    let model: 'gpt-4o' | 'gpt-4o-mini' = 'gpt-4o'

    try {
      const response = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('Empty response from AI when tailoring CV')
      }

      const parsed = JSON.parse(content) as unknown
      return tailoredCVContentSchema.parse(parsed)
    } catch (error: unknown) {
      // If context window exceeded, retry with smaller model
      if (isContextWindowError(error)) {
        console.warn('[AI] gpt-4o context window exceeded, falling back to gpt-4o-mini')
        model = 'gpt-4o-mini'

        const response = await client.chat.completions.create({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
          throw new Error('Empty response from AI when tailoring CV (fallback)')
        }

        const parsed = JSON.parse(content) as unknown
        return tailoredCVContentSchema.parse(parsed)
      }

      throw error
    }
  })
}

// ─── 5.6: Generate Answers ──────────────────────────────────────────────────

export async function generateAnswers(
  profile: ParsedCVProfile,
  requirements: JobRequirements,
  questions: string[],
  priorAnswers: ApplicationAnswer[] = []
): Promise<string[]> {
  return withRetry(async () => {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a job application assistant. Generate thoughtful, personalized answers to job application questions based on the candidate's profile and the job requirements. 
Return a JSON object: { "answers": string[] }
The answers array MUST have exactly the same number of elements as the questions array.
Each answer should be professional, specific, and draw on the candidate's real experience.
Do NOT fabricate experiences or skills not present in the profile.`,
        },
        {
          // Requirement 21.1: all user-supplied text in the user turn
          role: 'user',
          content: JSON.stringify({ profile, requirements, questions, priorAnswers }),
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from AI when generating answers')
    }

    const parsed = JSON.parse(content) as { answers?: string[] }
    const answers = Array.isArray(parsed.answers) ? parsed.answers : []

    // Ensure we return exactly as many answers as questions
    while (answers.length < questions.length) {
      answers.push('')
    }

    return answers.slice(0, questions.length)
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isContextWindowError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  // OpenAI API returns specific error codes for context length issues
  const errObj = error as Record<string, unknown>
  if (errObj['code'] === 'context_length_exceeded') return true

  const message =
    typeof errObj['message'] === 'string' ? errObj['message'] : ''
  if (message.includes('maximum context length')) return true
  if (message.includes('context_length_exceeded')) return true

  return false
}
