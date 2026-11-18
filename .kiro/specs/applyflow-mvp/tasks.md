# Implementation Plan: ApplyFlow MVP

## Overview

This plan delivers the ApplyFlow MVP across 25 ordered, dependency-aware tasks. The sequence moves from infrastructure outward: monorepo scaffold → shared types → domain packages → database → API layers → web dashboard → browser extension → tests. Each task is self-contained enough to be assigned and reviewed independently; no task requires work from a later one.

## Tasks

### Task List

- [x] 1. Monorepo Scaffold
  - [x] 1.1 Initialize pnpm workspace with `pnpm-workspace.yaml` declaring `apps/*` and `packages/*` globs
  - [x] 1.2 Add `turbo.json` with pipeline tasks (`build`, `test`, `lint`, `dev`) and correct dependency ordering (`dependsOn: ["^build"]` for build)
  - [x] 1.3 Create root `tsconfig.base.json` with strict mode, `moduleResolution: bundler`, `target: ES2022`, and path aliases; add per-package `tsconfig.json` files extending the base
  - [x] 1.4 Add root `.eslintrc.js` using `typescript-eslint` recommended rules with Prettier integration; add `.prettierrc` and `.prettierignore`
  - [x] 1.5 Configure root `vitest.config.ts` as a workspace config pointing to each package/app test config
  - [x] 1.6 Create stub `package.json` files for all seven workspaces (`apps/api`, `apps/web`, `apps/extension`, `packages/shared`, `packages/ai`, `packages/cv-parser`, `packages/job-analyzer`) with correct `name`, `main`/`exports`, and cross-workspace `dependencies`
  - [x] 1.7 Add root scripts — `build`, `dev`, `test`, `lint`, `format` — that delegate to Turborepo

- [x] 2. Shared Package
  **Depends on:** Task 1
  - [x] 2.1 Create TypeScript interfaces for all domain types: `User`, `UserProfile`, `CV`, `ParsedCVProfile`, `EducationEntry`, `ExperienceEntry`, `ProjectEntry`, `Job`, `JobRequirements`, `CompatibilityAnalysis`, `ScoreBreakdown`, `SkillGap`, `TailoredCV`, `TailoredCVContent`, `CVChange`, `Application`, `ApplicationAnswer`, `ApplicationStatus`
  - [x] 2.2 Create Zod schemas: `cvUploadSchema`, `jobExtractionSchema`, `analyzeSchema`, `tailorCVSchema`, `generateAnswersSchema`, `createApplicationSchema`, `updateApplicationStatusSchema`
  - [x] 2.3 Create API contract request/response types derived from the Zod schemas using `z.infer`
  - [x] 2.4 Validate that all enum literals (`ApplicationStatus`, `Platform`, `SkillGap.severity`) are co-defined as TypeScript union types and Zod enums
  - [x] 2.5 Write barrel export in `packages/shared/src/index.ts` re-exporting everything from `./types/*`, `./schemas/*`, and `./api/contracts`
  - [x] 2.6 Build the package and verify downstream imports resolve without type errors

- [x] 3. CV Parser Package
  **Depends on:** Task 1
  - [x] 3.1 Install `pdf-parse` and `mammoth` as dependencies; install `file-type` for magic-byte detection
  - [x] 3.2 Implement `parsePDF(buffer: Buffer): Promise<string>` using `pdf-parse`; throw a typed `ParseError` if the result is empty
  - [x] 3.3 Implement `parseDOCX(buffer: Buffer): Promise<string>` using `mammoth.extractRawText`; throw a typed `ParseError` if the result is empty
  - [x] 3.4 Implement `detectMimeType(buffer: Buffer): Promise<SupportedMimeType | null>` using `file-type` to read magic bytes, returning the detected MIME or null for unsupported types
  - [x] 3.5 Implement the public `parse(buffer, mimeType)` function that calls `detectMimeType` to verify magic bytes match the declared MIME before dispatching to `parsePDF` or `parseDOCX`
  - [x] 3.6 Export `CVParser`, `ParseError`, and `SupportedMimeType` from the package barrel; add unit tests for both parsers with fixture files

- [ ] 4. Job Analyzer Package
  **Depends on:** Tasks 1, 2
  - [~] 4.1 Implement `normalizedMatch(required: string, profileSkills: string[]): boolean` using case-insensitive exact match and Levenshtein similarity ≥ 0.85 (using a pure-TS Levenshtein implementation, no external dep required)
  - [~] 4.2 Implement `scoreCompatibility(profile, requirements): ScoreBreakdown` following Algorithm 6: skills score (required matches / total), experience score (total months vs required months, capped at 100), education heuristic, keyword overlap — all subscores in [0, 100]
  - [~] 4.3 Implement `identifyGaps(profile, requirements): SkillGap[]` — for each required/preferred skill in `JobRequirements` absent from profile skills (after normalisation), emit a `SkillGap` with appropriate `required` flag and `severity`
  - [~] 4.4 Implement `buildTailoringConstraints(profile, gaps): TailoringConstraints` — produce `forbiddenAdditions` (all skills/entities not in profile), `emphasize` (skills matching job), and `deprioritize` (skills irrelevant to job)
  - [~] 4.5 Implement `computeWeightedScore(breakdown: ScoreBreakdown): number` applying the 40/30/15/15 weights and returning a value in [0, 100]
  - [~] 4.6 Export the full `JobAnalyzer` interface and all helpers from the package barrel; add unit tests for scoring, gap identification, and weighted score computation

- [ ] 5. AI Package
  **Depends on:** Tasks 1, 2
  - [~] 5.1 Set up the OpenAI client wrapper (`packages/ai/src/client.ts`) initialized from `process.env.OPENAI_API_KEY`; export a singleton `aiClient`
  - [~] 5.2 Implement `extractCVProfile(rawText: string): Promise<ParsedCVProfile>` — structured output prompt using `gpt-4o`, response validated against the `ParsedCVProfile` shape
  - [~] 5.3 Implement `extractJobRequirements(rawDescription: string): Promise<JobRequirements>` — structured output prompt placing the raw description in the user turn (never in the system prompt, per Requirement 21.1)
  - [~] 5.4 Implement `analyzeCompatibility(profile, requirements): Promise<CompatibilityResult>` returning qualitative `strengths` and `recommendations`
  - [~] 5.5 Implement `tailorCV(profile, requirements, systemPrompt): Promise<TailoredCVContent>` with model fallback: attempt `gpt-4o`; if the prompt exceeds the context window, retry with `gpt-4o-mini` (Requirement 20.4)
  - [~] 5.6 Implement `generateAnswers(profile, requirements, questions, priorAnswers): Promise<string[]>` placing all user-supplied text in the user turn
  - [~] 5.7 Implement `withRetry<T>(fn: () => Promise<T>, maxAttempts: number): Promise<T>` — exponential backoff with delays 1 s, 2 s, 4 s on 429 and 5xx responses; throw `AIUnavailableError` after exhausting retries; log each failed attempt (Requirement 13)
  - [~] 5.8 Wrap every public AI function with `withRetry`; export `AIClient`, `AIUnavailableError`, and all function implementations from the barrel

- [ ] 6. Database Schema
  **Depends on:** Task 1
  - [x] 6.1 Write the Prisma schema (`apps/api/prisma/schema.prisma`) with all 7 models: `User`, `UserProfile`, `CV`, `Job`, `CompatibilityAnalysis`, `TailoredCV`, `Application` — including all JSONB fields (`parsedProfile`, `requirements`, `scoreBreakdown`, `gaps`, `strengths`, `recommendations`, `content`, `answers`) typed as `Json`
  - [ ] 6.2 Add `@@index([userId, createdAt])` to both the `Job` and `Application` models
  - [~] 6.3 Define the `UserProfile` model with all optional fields (`headline`, `location`, `linkedinUrl`, `githubUrl`, `portfolioUrl`) and a unique relation to `User`
  - [~] 6.4 Add a `RefreshToken` model (or token field on `User`) to support JWT refresh token storage and rotation
  - [~] 6.5 Run `prisma migrate dev --name init` to generate the initial migration SQL file; commit migration files to source control
  - [~] 6.6 Generate the Prisma client and verify TypeScript types are emitted correctly; add a `postinstall` script to regenerate the client on `pnpm install`

- [ ] 7. Backend API — Auth
  **Depends on:** Tasks 2, 6
  - [~] 7.1 Implement `POST /api/auth/register`: validate body with `registerSchema`, hash password with `bcrypt`, create `User` record, return signed JWT + set `httpOnly` refresh token cookie; return 409 if email already exists (Requirement 1.1, 1.3)
  - [~] 7.2 Implement `POST /api/auth/login`: validate credentials, compare password hash, return signed JWT + `httpOnly` refresh token cookie; return 401 on invalid credentials (Requirement 1.2, 1.4)
  - [~] 7.3 Implement `POST /api/auth/refresh`: validate refresh token from cookie, issue a new access token without re-login (Requirement 1.6)
  - [~] 7.4 Issue JWT access tokens with 24-hour expiry signed with `process.env.JWT_SECRET`; store secret and all credentials exclusively in environment variables (Requirements 1.5, 21.2)
  - [~] 7.5 Implement `authMiddleware` that extracts and verifies the Bearer JWT on every route except register and login; return 401 for missing or invalid tokens (Requirement 1.7)
  - [~] 7.6 Wire auth routes into the Express app and verify 401 is returned for unauthenticated requests to protected routes

- [ ] 8. Backend API — Profile
  **Depends on:** Tasks 2, 6, 7
  - [~] 8.1 Implement `GET /api/profile`: query `UserProfile` by `req.userId`, return current profile or 404 if none exists yet
  - [~] 8.2 Implement `PUT /api/profile`: validate body with the profile Zod schema (allowing optional fields to be null/undefined), upsert the `UserProfile` record, return the updated profile (Requirement 2.1, 2.3)
  - [~] 8.3 Ensure optional fields (`headline`, `location`, `linkedinUrl`, `githubUrl`, `portfolioUrl`) are stored as `null` when omitted and no error is thrown (Requirement 2.3)

- [ ] 9. Backend API — CVs
  **Depends on:** Tasks 2, 3, 5, 6, 7
  - [~] 9.1 Implement magic-byte MIME validation middleware: read the first bytes of the uploaded buffer via CV Parser's `detectMimeType`; return 400 if the type is not PDF or DOCX regardless of `Content-Type` header (Requirements 3.5, 3.9, 21.3)
  - [~] 9.2 Implement file-size enforcement at the application layer: reject files > 10 MB with 413 before invoking any storage or parsing logic (Requirement 3.6, 3.10)
  - [~] 9.3 Implement `POST /api/cvs`: store file in S3 under `cvs/{userId}/{cvId}/{filename}`, invoke CV Parser, invoke AI Client with `withRetry`, persist `CV` record, return 201 `{ cvId, profile }`; return 500 without creating DB record if S3 upload fails (Requirements 3.1–3.8)
  - [~] 9.4 Offload PDF/DOCX parsing to a Node.js worker thread when the file buffer exceeds 2 MB (Requirement 20.1)
  - [~] 9.5 Implement `GET /api/cvs`: return paginated list of the authenticated user's CVs scoped with `WHERE userId = req.userId` (Requirement 15.1)
  - [~] 9.6 Implement `GET /api/cvs/:id/download-url`: generate an S3 presigned URL scoped to the CV's `storageKey` with a 15-minute expiry; return 403 if the CV does not belong to the authenticated user (Requirements 15, 16)
  - [~] 9.7 Return structured error `{ error: 'cv_parse_failed', reason: 'empty_text' | 'parse_error' }` with status 422 when CV Parser returns empty text or throws (Requirement 3.7)

- [ ] 10. Backend API — Jobs
  **Depends on:** Tasks 2, 5, 6, 7
  - [~] 10.1 Implement `POST /api/jobs/extract`: validate `rawDescription` length (100–50,000 chars) with Shared schema, return 400 otherwise; check deduplication — if same `(sourceUrl, userId)` within 24 hours, return existing job with 200 (Requirements 4.1, 4.3, 4.5)
  - [~] 10.2 Implement `detectPlatform(url: string)` mapping URL patterns to `'linkedin'`, `'indeed'`, `'greenhouse'`, or `'unknown'` (Requirement 4.4)
  - [~] 10.3 Invoke AI Client to extract `JobRequirements` from the raw description; persist the `Job` record and return 201 `{ jobId, job }` (Requirement 4.1, 4.2)
  - [~] 10.4 Implement `GET /api/jobs`: return a list of the authenticated user's jobs scoped with `WHERE userId = req.userId` (Requirement 15.1)

- [ ] 11. Backend API — Analysis
  **Depends on:** Tasks 2, 4, 5, 6, 7
  - [~] 11.1 Implement `POST /api/analyze`: validate `cvId` and `jobId` belong to `req.userId`, return 403 otherwise; return 422 if `cv.parsedProfile` is null (Requirements 5.6, 5.7)
  - [~] 11.2 Implement 1-hour cache check: query for an existing `CompatibilityAnalysis` with the same `(cvId, jobId)` created within the last hour; if found, return it with 200 without re-invoking AI (Requirement 5.5)
  - [~] 11.3 Run `jobAnalyzer.scoreCompatibility` and `jobAnalyzer.identifyGaps` locally, then call `aiClient.analyzeCompatibility` for qualitative enrichment; compute weighted overall score using 40/30/15/15 weights; persist and return 201 (Requirements 5.1–5.4)
  - [~] 11.4 Enforce per-user rate limit of 10 requests/hour on this endpoint using an in-process or Redis-backed rate limiter; return 429 with `Retry-After` header on breach (Requirement 14.1, 14.3)

- [ ] 12. Backend API — CV Tailoring
  **Depends on:** Tasks 2, 4, 5, 6, 7, 11
  - [~] 12.1 Implement `POST /api/cvs/tailor`: verify a completed `CompatibilityAnalysis` exists for `(cvId, jobId)`; return 422 if not (Requirement 6.2)
  - [~] 12.2 Build tailoring constraints with `jobAnalyzer.buildTailoringConstraints`; construct the system prompt explicitly forbidding fabrication; call `aiClient.tailorCV` (Requirement 6)
  - [~] 12.3 Implement `validateNoFabrication(tailored, original)`: check each experience entry's `(company, title)` and each skill against the original `ParsedCVProfile`; throw `FabricationError` on any new entity (Requirement 6.3)
  - [~] 12.4 On `FabricationError`, retry once with a stricter system prompt; if the second attempt also fails validation, return 500 and do not persist the record (Requirements 6.5, 6.6)
  - [~] 12.5 On success, persist `TailoredCV` and return 201; verify `changeLog` is non-empty before persisting (Requirement 6.4)
  - [~] 12.6 Enforce per-user rate limit of 5 requests/hour; return 429 with `Retry-After` header on breach (Requirement 14.2, 14.3)

- [ ] 13. Backend API — Applications
  **Depends on:** Tasks 2, 5, 6, 7
  - [~] 13.1 Implement `POST /api/applications/answers`: validate `questions` is non-empty and no question is blank after trim, return 400 otherwise; fetch up to 20 most recent prior answers for consistency context; call `aiClient.generateAnswers`; return array of `ApplicationAnswer` with `source: 'ai-generated'` (Requirements 7.1–7.4)
  - [~] 13.2 Implement `POST /api/applications`: validate body with `createApplicationSchema`; verify `jobId` and `cvId` belong to `req.userId`, return 403 otherwise; default `status` to `'draft'`; create `Application` record and return 201 (Requirements 9.1, 9.2, 9.5, 9.6)
  - [~] 13.3 Implement `PATCH /api/applications/:id`: validate the new status is one of the six allowed values; verify ownership; update status and return the updated record (Requirements 9.3, 9.4)
  - [~] 13.4 Implement `GET /api/applications`: return a paginated list of the authenticated user's applications scoped to `req.userId` (Requirement 10.1)
  - [~] 13.5 Implement `GET /api/applications/:id`: verify ownership; return the full `ApplicationDetail` including joined `job`, `cv`, `analysis`, `tailoredCv`, and `answers` (Requirement 10.2)

- [ ] 14. Web Dashboard — Auth Pages
  **Depends on:** Tasks 2, 7
  - [~] 14.1 Create the Next.js App Router register page (`/register`) with a form for email and password; submit to `POST /api/auth/register`; redirect to dashboard on success
  - [~] 14.2 Create the login page (`/login`) with email and password fields; submit to `POST /api/auth/login`; store the returned JWT in `localStorage` or a cookie accessible to the Next.js app; redirect to dashboard on success
  - [~] 14.3 Implement client-side form validation using the Shared Zod schemas before submission; show field-level error messages inline
  - [~] 14.4 Add a Next.js middleware (`middleware.ts`) that redirects unauthenticated users to `/login` for all protected routes under `/dashboard`, `/profile`, `/cvs`, `/jobs`, `/applications`

- [ ] 15. Web Dashboard — Layout & Navigation
  **Depends on:** Tasks 2, 14
  - [~] 15.1 Create an authenticated root layout (`app/(dashboard)/layout.tsx`) that wraps all protected pages
  - [~] 15.2 Implement the sidebar/nav component with links to: Profile, CVs, Jobs, Applications; highlight the active route
  - [~] 15.3 Add a user menu in the nav showing the authenticated user's email and a logout button that clears the token and redirects to `/login`
  - [~] 15.4 Make the layout responsive (mobile-collapsible sidebar)

- [ ] 16. Web Dashboard — Profile Page
  **Depends on:** Tasks 2, 8, 15
  - [~] 16.1 Create the profile page (`/profile`) that fetches `GET /api/profile` on load and pre-fills a form with current values
  - [~] 16.2 Implement a form with fields for `fullName`, `headline`, `location`, `linkedinUrl`, `githubUrl`, `portfolioUrl`; submit to `PUT /api/profile`
  - [~] 16.3 Validate the form with the Shared profile Zod schema; show inline field errors; display a success toast on save (Requirement 2.4)

- [ ] 17. Web Dashboard — CV Management
  **Depends on:** Tasks 2, 9, 15
  - [~] 17.1 Create the CV list page (`/cvs`) fetching `GET /api/cvs` and rendering a table with filename, upload date, and a download link per CV
  - [~] 17.2 Implement the presigned upload flow: request a presigned PUT URL from the API, upload the file directly to S3 from the browser, then notify the API with the metadata — this avoids routing the binary through the server (Requirement 20.5)
  - [~] 17.3 Show an upload progress bar using `XMLHttpRequest` or the Fetch Streams API during the direct-to-S3 upload (Requirement 3.12)
  - [~] 17.4 Generate and display a download link per CV by calling the presigned download URL endpoint (`GET /api/cvs/:id/download-url`) (Requirement 16.3)
  - [~] 17.5 Show client-side validation errors for unsupported file types and files > 10 MB before initiating the upload

- [ ] 18. Web Dashboard — Jobs Page
  **Depends on:** Tasks 2, 10, 15
  - [~] 18.1 Create the jobs list page (`/jobs`) fetching `GET /api/jobs` and rendering a table with job title, company, platform, and creation date (Requirement 4.9)
  - [~] 18.2 Add pagination controls or infinite scroll for the jobs list
  - [~] 18.3 Link each job row to any associated analyses or applications if present

- [ ] 19. Web Dashboard — Applications Pages
  **Depends on:** Tasks 2, 13, 15
  - [~] 19.1 Create the application list page (`/applications`) fetching `GET /api/applications` and showing job title, company, status badge, and submission date per row (Requirement 10.3)
  - [~] 19.2 Add pagination and status-filter controls to the list page
  - [~] 19.3 Create the application detail page (`/applications/[id]`) fetching `GET /api/applications/:id`; show the linked job summary, CV used, all answers with their `source` label, and a status timeline (Requirement 10.4)
  - [~] 19.4 Add a status update dropdown on the detail page that calls `PATCH /api/applications/:id` and refreshes the page (Requirement 10.5)
  - [~] 19.5 Display the tailored CV content and change log on the detail page if a `tailoredCvId` is present

- [ ] 20. Browser Extension — Scaffold
  **Depends on:** Task 1
  - [-] 20.1 Initialize the WXT project in `apps/extension` with React; configure `wxt.config.ts` for Chrome MV3
  - [~] 20.2 Write `manifest` entries in WXT config: `side_panel` permission, `storage` permission, `scripting` permission, host permissions for `linkedin.com`, `indeed.com`, `boards.greenhouse.io`, and the API origin
  - [~] 20.3 Set up the background service worker (`background.ts`): export `defineBackground`, implement `getAuthToken()` reading from `chrome.storage.local`, and `callAPI<T>(endpoint, body)` that attaches the Bearer token to fetch requests
  - [~] 20.4 Configure `tsconfig.json` for the extension workspace to extend the root base config and add WXT type definitions

- [ ] 21. Browser Extension — Auth
  **Depends on:** Tasks 2, 7, 20
  - [~] 21.1 On extension load, read `authToken` from `chrome.storage.local`; if absent or the token's expiry has passed, display the unauthenticated UI state (Requirement 11.1, 11.2)
  - [~] 21.2 Add a `chrome.storage.onChanged` listener in the background service worker so that when the Dashboard writes a new token after login, the extension UI updates without a manual reload (Requirement 11.3)
  - [~] 21.3 Display the unauthenticated prompt containing a "Sign in to ApplyFlow" button that opens the Dashboard `/login` page in a new tab (Requirement 11.1)
  - [~] 21.4 Block all API calls that require authentication while in the unauthenticated state; only `getAuthToken` may run (Requirement 11.4)
  - [~] 21.5 When the Dashboard stores the JWT (e.g., in `localStorage` keyed `applyflow_token`), have the Dashboard also write it to `chrome.storage.local` via the extension's content script message bus so the extension can read it

- [ ] 22. Browser Extension — Content Scripts
  **Depends on:** Tasks 2, 20, 21
  - [~] 22.1 Implement the LinkedIn adapter (`adapters/linkedin.ts`): match `linkedin.com/jobs/*`, extract job title (`h1.top-card-layout__title`), company, description, and source URL from the page DOM
  - [~] 22.2 Implement the Indeed adapter (`adapters/indeed.ts`): match `indeed.com/viewjob*`, extract job title, company, and description from the page DOM
  - [~] 22.3 Implement the Greenhouse adapter (`adapters/greenhouse.ts`): match `boards.greenhouse.io/*`, extract job title, company, and description from the page DOM
  - [~] 22.4 Implement `JobPageAdapter.isSupported(url)` and a router that selects the correct adapter or falls back to unsupported state; on detection, send extracted data to the background service worker via `chrome.runtime.sendMessage` (Requirement 4.6)
  - [~] 22.5 On unsupported pages, display the inactive state message "This job board is not yet supported" and render a manual text area for pasting a job description (Requirement 4.8)
  - [~] 22.6 After successful extraction, call `POST /api/jobs/extract` through the background service worker and cache the returned `jobId` for subsequent analysis calls (Requirement 4.7)

- [ ] 23. Browser Extension — Side Panel UI
  **Depends on:** Tasks 2, 11, 12, 13, 21, 22
  - [~] 23.1 Implement the UI state machine with states `idle → detecting → analyzing → ready | error` using Zustand or React Context; ensure only one state is active at a time (Requirement 12.1)
  - [~] 23.2 Show a progress indicator (spinner + status text) during `detecting` and `analyzing` states; map each in-flight API call to the appropriate state transition (Requirement 12.2)
  - [~] 23.3 On `error` state, display a human-readable error message derived from the API error response; offer a retry button that resets the state machine to `detecting` (Requirement 12.3)
  - [~] 23.4 In the `ready` state, display the compatibility score, score breakdown bars, skill gaps list, strengths, and AI recommendations (Requirements 5.8, 12.4)
  - [~] 23.5 Display the tailored CV content in a collapsible section with a diff view highlighting rewritten bullets compared to the original (Requirement 6.7)
  - [~] 23.6 Display generated answers in a list; make each answer editable in an inline text area; track `source` as `'user-edited'` when the user modifies an answer (Requirements 7.5, 8.2)
  - [~] 23.7 Add a "Save Application" button that posts to `POST /api/applications` with the current `jobId`, `cvId`, `tailoredCvId`, `analysisId`, and answers array (Requirement 9.7)

- [ ] 24. Browser Extension — Form Fill
  **Depends on:** Tasks 2, 22, 23
  - [~] 24.1 Implement `detectFormFields(): FormField[]` in each content script adapter: query the DOM for `<input>`, `<textarea>`, and `<select>` elements within the application form container; return an array of `{ id, label, type }` objects
  - [~] 24.2 Implement `fillFormField(fieldId: string, value: string)`: set the element's `.value`, then dispatch `new Event('input', { bubbles: true })` and `new Event('change', { bubbles: true })` to trigger the form's own validation (Requirement 8.3)
  - [~] 24.3 Add a "Fill Form" button in the side panel that is enabled only after the user has reviewed all answers; on click, call `fillFormField` for each detected field (Requirements 8.1, 8.2)
  - [~] 24.4 After filling, scroll to and visually highlight each filled field so the user can confirm the values before submitting

- [ ] 25. Testing
  **Depends on:** Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
  - [~] 25.1 Write unit tests for `scoreCompatibility` in `packages/job-analyzer`: test all-match case (score 100), zero-match case (score 0), partial match, zero required skills (score 100), experience capping at 100, keyword overlap
  - [~] 25.2 Write unit tests for `identifyGaps`: verify that only skills absent from the profile after normalization appear in gaps; test that preferred-skill gaps have `required: false`
  - [~] 25.3 Write unit tests for `packages/cv-parser`: test that a fixture PDF returns non-empty text, that a fixture DOCX returns non-empty text, that a non-PDF/DOCX buffer causes a `ParseError`, and that an empty-result file causes a `ParseError`
  - [~] 25.4 Write unit tests for all Shared Zod schemas: verify valid payloads pass, verify required fields missing cause validation errors, verify length constraints on `rawDescription` are enforced
  - [~] 25.5 Write a property-based test (fast-check) for **score bounds**: for any `ParsedCVProfile` and `JobRequirements`, `scoreCompatibility` returns a `ScoreBreakdown` where every sub-score and the weighted overall score are in [0, 100]
    **Validates: Requirements 5.2, 5.3**
  - [~] 25.6 Write a property-based test (fast-check) for **gap subset**: for any profile and requirements, every `SkillGap` returned by `identifyGaps` has its `skill` present in `requirements.requiredSkills` or `requirements.preferredSkills` and absent from `profile.skills` after normalization
    **Validates: Requirement 5.4**
  - [~] 25.7 Write a property-based test (fast-check) for **no fabrication**: for any `ParsedCVProfile`, `validateNoFabrication` does not throw when given a `TailoredCVContent` whose experience entries and skills are strict subsets of the original profile
    **Validates: Requirement 6.3**
  - [~] 25.8 Write a property-based test (fast-check) for **answer count**: for any non-empty array of non-empty question strings (length 1–20), the mock `generateApplicationAnswers` stub returns an array of exactly the same length
    **Validates: Requirement 7.1**

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "6", "20"] },
    { "wave": 3, "tasks": ["4", "5"] },
    { "wave": 4, "tasks": ["7"] },
    { "wave": 5, "tasks": ["8", "10", "13", "14"] },
    { "wave": 6, "tasks": ["9", "11", "15", "21"] },
    { "wave": 7, "tasks": ["12", "16", "17", "18", "19", "22"] },
    { "wave": 8, "tasks": ["23"] },
    { "wave": 9, "tasks": ["24"] },
    { "wave": 10, "tasks": ["25"] }
  ],
  "dependencies": {
    "2":  ["1"],
    "3":  ["1"],
    "4":  ["1", "2"],
    "5":  ["1", "2"],
    "6":  ["1"],
    "7":  ["2", "6"],
    "8":  ["2", "6", "7"],
    "9":  ["2", "3", "5", "6", "7"],
    "10": ["2", "5", "6", "7"],
    "11": ["2", "4", "5", "6", "7"],
    "12": ["2", "4", "5", "6", "7", "11"],
    "13": ["2", "5", "6", "7"],
    "14": ["2", "7"],
    "15": ["2", "14"],
    "16": ["2", "8", "15"],
    "17": ["2", "9", "15"],
    "18": ["2", "10", "15"],
    "19": ["2", "13", "15"],
    "20": ["1"],
    "21": ["2", "7", "20"],
    "22": ["2", "20", "21"],
    "23": ["2", "11", "12", "13", "21", "22"],
    "24": ["2", "22", "23"],
    "25": ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]
  }
}
```

## Notes

- All secrets (`OPENAI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, S3 credentials) must be injected via environment variables. Never commit them to source (Requirement 21.2).
- The Prisma client must be regenerated (`prisma generate`) any time the schema changes. The `postinstall` script added in Task 6.6 handles this automatically on `pnpm install`.
- Worker thread offloading for large CVs (Task 9.4) is only triggered when the buffer exceeds 2 MB; smaller files parse synchronously for latency.
- The direct-to-S3 presigned upload flow (Task 17.2) means the binary never transits the API server for dashboard uploads. The extension uploads still go through the API multipart route.
- Property-based tests in Task 25 use **fast-check** as specified in the design document. Run with `vitest --run` to avoid watch mode in CI.
- Rate limiters in Tasks 11.4 and 12.6 should share a common middleware factory so the per-user window logic is defined once.
- The `gpt-4o` → `gpt-4o-mini` fallback in Task 5.5 must be transparent to callers; only the AI package handles the model selection.
