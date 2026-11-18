# Requirements Document

## Introduction

ApplyFlow MVP is a hybrid AI job application assistant consisting of three tightly integrated components: a browser extension, a web dashboard, and a backend API. Together they automate and streamline the end-to-end job application workflow — from CV upload and job detection through compatibility analysis, tailored CV generation, application question answering, form-fill assistance, and application tracking.

The system is built as a TypeScript monorepo (pnpm + Turborepo) with a Node.js/Express backend, a Next.js web dashboard, and a WXT + React browser extension. AI features run through the OpenAI API; file storage uses S3-compatible object storage; data is persisted in PostgreSQL via Prisma.

---

## Glossary

- **System**: The ApplyFlow MVP platform (all three components collectively).
- **API**: The Node.js + Express backend (`apps/api`).
- **Dashboard**: The Next.js web application (`apps/web`).
- **Extension**: The browser extension built with WXT + React (`apps/extension`).
- **CV_Parser**: The `packages/cv-parser` package responsible for extracting plain text from uploaded files.
- **Job_Analyzer**: The `packages/job-analyzer` package responsible for local scoring and gap identification.
- **AI_Client**: The `packages/ai` package wrapping all OpenAI API calls.
- **Shared**: The `packages/shared` package containing TypeScript types and Zod validation schemas.
- **User**: An authenticated human end-user of the System.
- **CV**: A PDF or DOCX file uploaded by a User containing their professional history.
- **ParsedCVProfile**: The structured JSON object extracted from a CV by the AI_Client.
- **Job**: A job listing detected or manually entered by a User.
- **JobRequirements**: The structured JSON object extracted from a raw job description by the AI_Client.
- **CompatibilityAnalysis**: The scored assessment of how well a CV matches a Job.
- **TailoredCV**: A version of a CV rewritten by the AI_Client to emphasise content relevant to a specific Job, without introducing fabricated content.
- **Application**: A record linking a User, a Job, a CV, and a set of answers, tracking the status of a job application.
- **ApplicationAnswer**: A single question–answer pair associated with an Application.
- **S3**: The S3-compatible object storage service used for file persistence.
- **JWT**: JSON Web Token used for stateless authentication.

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a new visitor, I want to register an account and log in, so that I can securely access my personal data and use ApplyFlow features.

#### Acceptance Criteria

1. WHEN a user submits a valid email and password to `POST /api/auth/register`, THE API SHALL create a new User record and return a signed JWT access token and an `httpOnly` refresh token cookie.
2. WHEN a user submits valid credentials to `POST /api/auth/login`, THE API SHALL return a signed JWT access token and an `httpOnly` refresh token cookie.
3. IF a user submits an email that is already registered, THEN THE API SHALL return a 409 Conflict response without creating a duplicate record.
4. IF a user submits invalid credentials to `POST /api/auth/login`, THEN THE API SHALL return a 401 Unauthorized response.
5. THE API SHALL issue JWT access tokens that expire after 24 hours.
6. WHEN a valid refresh token is presented to the token refresh endpoint, THE API SHALL issue a new access token without requiring the user to re-enter credentials.
7. WHILE a request is made to any API route other than `POST /api/auth/register` and `POST /api/auth/login`, THE API SHALL reject requests that do not carry a valid JWT with a 401 response.

---

### Requirement 2: User Profile Management

**User Story:** As a registered user, I want to create and update my professional profile, so that the system can personalise analysis results and answer generation.

#### Acceptance Criteria

1. WHEN an authenticated user submits profile data to `PUT /api/profile`, THE API SHALL persist the full name, headline, location, LinkedIn URL, GitHub URL, and portfolio URL associated with that user.
2. WHEN an authenticated user requests `GET /api/profile`, THE API SHALL return the current profile for that user.
3. IF a profile field is optional (headline, location, LinkedIn URL, GitHub URL, portfolio URL) and not provided, THEN THE API SHALL store null for that field without returning an error.
4. THE Dashboard SHALL provide a profile page where the user can view and edit all profile fields.

---

### Requirement 3: CV Upload and Parsing

**User Story:** As a job seeker, I want to upload my CV in PDF or DOCX format, so that the system can extract my professional history and use it for analysis and tailoring.

#### Acceptance Criteria

1. WHEN an authenticated user submits a valid PDF or DOCX file to `POST /api/cvs`, THE API SHALL store the raw file in S3 under the key `cvs/{userId}/{cvId}/{filename}` before creating any database record.
2. WHEN the raw file is successfully stored in S3, THE API SHALL invoke CV_Parser to extract plain text from the file.
3. WHEN plain text is extracted, THE API SHALL invoke AI_Client to produce a ParsedCVProfile and persist it in the CV record as a JSONB field.
4. WHEN the CV record is successfully created, THE API SHALL return a 201 response containing `{ cvId, profile }`.
5. IF the uploaded file's MIME type is not `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, THEN THE API SHALL return a 400 Bad Request response without storing any file.
6. IF the uploaded file exceeds 10 MB, THEN THE API SHALL return a 413 Payload Too Large response without storing any file.
7. IF the CV_Parser returns empty text or throws a parse error, THEN THE API SHALL return a 422 Unprocessable Entity response with `{ error: 'cv_parse_failed', reason: 'empty_text' | 'parse_error' }`.
8. IF the S3 `putObject` call fails during CV upload, THEN THE API SHALL not create a CV database record and SHALL return a 500 response.
9. THE API SHALL verify file type by reading magic bytes, not solely by trusting the Content-Type header.
10. THE API SHALL enforce a maximum file size of 10 MB at the application layer in addition to any reverse-proxy limit.
11. WHEN the AI_Client returns a rate-limit or server error during CV profile extraction, THE API SHALL retry up to three times with exponential backoff (delays of 1 s, 2 s, 4 s) before returning a 503 response.
12. THE Dashboard SHALL provide a CV upload interface with progress indication.
13. THE Dashboard SHALL display a list of the authenticated user's uploaded CVs.

---

### Requirement 4: Job Description Extraction

**User Story:** As a job seeker browsing a job listing, I want the system to automatically extract and structure the job description, so that I can receive accurate compatibility analysis without manual data entry.

#### Acceptance Criteria

1. WHEN an authenticated user submits a raw job description string and a source URL to `POST /api/jobs/extract`, THE API SHALL invoke AI_Client to parse the description into a JobRequirements object and persist a Job record.
2. WHEN a Job record is created, THE API SHALL return a 201 response containing `{ jobId, job }`.
3. IF `rawDescription` length is less than 100 characters or greater than 50,000 characters, THEN THE API SHALL return a 400 Bad Request response.
4. WHEN the source URL contains `linkedin.com`, THE API SHALL record the platform as `'linkedin'`; WHEN it contains `indeed.com`, as `'indeed'`; WHEN it contains `greenhouse.io`, as `'greenhouse'`; otherwise as `'unknown'`.
5. WHEN `POST /api/jobs/extract` is called with the same `sourceUrl` and `userId` within 24 hours, THE API SHALL return the existing Job record with a 200 response instead of creating a duplicate.
6. THE Extension SHALL automatically detect when the user is on a supported job page (LinkedIn Jobs at `linkedin.com/jobs/*`, Indeed at `indeed.com/viewjob*`, Greenhouse at `boards.greenhouse.io/*`) and extract the job title, description, requirements, and company from the page DOM.
7. WHEN the Extension detects a supported job page, THE Extension SHALL send the extracted raw description and source URL to `POST /api/jobs/extract`.
8. WHEN the Extension is loaded on an unsupported job page, THE Extension SHALL display an inactive state with the message "This job board is not yet supported" and provide a manual input field for the user to paste a job description.
9. THE Dashboard SHALL display a list of jobs associated with the authenticated user.

---

### Requirement 5: Compatibility Analysis

**User Story:** As a job seeker, I want to see how well my CV matches a job listing, so that I can understand my strengths and gaps before applying.

#### Acceptance Criteria

1. WHEN an authenticated user submits a valid `cvId` and `jobId` to `POST /api/analyze`, THE API SHALL run a compatibility analysis and return a 201 response containing the full CompatibilityAnalysis object.
2. THE API SHALL compute an overall compatibility score in the closed interval [0, 100] using weighted sub-scores: skills (40%), experience (30%), education (15%), keywords (15%).
3. THE API SHALL compute a ScoreBreakdown where each sub-score (skills, experience, education, keywords) is in the closed interval [0, 100].
4. THE API SHALL identify SkillGaps where each gap's skill is present in the job's required or preferred skills but absent from the CV's parsed skills list (after normalisation).
5. WHEN `POST /api/analyze` is called with the same `(cvId, jobId)` pair within 1 hour, THE API SHALL return the cached CompatibilityAnalysis with the same `id`, `score`, and `gaps` without re-invoking AI_Client.
6. IF `cvId` or `jobId` does not belong to the authenticated user, THEN THE API SHALL return a 403 Forbidden response.
7. IF the CV's `parsedProfile` is null, THEN THE API SHALL return a 422 response indicating the CV has not been fully parsed.
8. THE Extension SHALL display the compatibility score, score breakdown, identified gaps, strengths, and AI-generated recommendations in its side-panel UI after analysis completes.
9. THE Dashboard SHALL display compatibility analysis results visually, including the overall score and breakdown.

---

### Requirement 6: CV Tailoring Without Fabrication

**User Story:** As a job seeker, I want a version of my CV tailored to a specific job, so that my application highlights the most relevant experience without misrepresenting my background.

#### Acceptance Criteria

1. WHEN an authenticated user submits a valid `cvId` and `jobId` to `POST /api/cvs/tailor`, THE API SHALL produce a TailoredCV and return a 201 response.
2. THE API SHALL require a completed CompatibilityAnalysis for the `(cvId, jobId)` pair before tailoring.
3. THE TailoredCV SHALL contain only skills, companies, job titles, degrees, and dates that are present in the original ParsedCVProfile — no new entities SHALL be introduced.
4. THE TailoredCV SHALL include a non-empty `changeLog` that documents every section modification with the change type and rationale.
5. IF the AI_Client output fails the fabrication validation check, THEN THE API SHALL retry the tailoring call once with a stricter system prompt.
6. IF the second tailoring attempt also fails fabrication validation, THEN THE API SHALL return a 500 response and SHALL NOT persist the TailoredCV.
7. THE Extension SHALL present the TailoredCV content to the user and SHALL show a diff compared to the original CV.
8. THE Dashboard SHALL display tailored CV content and allow the user to view the diff and change log.

---

### Requirement 7: Application Question Answer Generation

**User Story:** As a job seeker filling out an application form, I want AI-generated answers to application questions based on my profile and the job, so that I can complete forms faster and more consistently.

#### Acceptance Criteria

1. WHEN an authenticated user submits a `jobId`, `cvId`, and a non-empty array of non-empty question strings to `POST /api/applications/answers`, THE API SHALL return an array of ApplicationAnswers with exactly one answer per question.
2. EACH ApplicationAnswer SHALL have `source` set to `'ai-generated'`.
3. IF `questions` is empty or any question string is blank after trimming, THEN THE API SHALL return a 400 Bad Request response.
4. THE API SHALL pass up to 20 of the user's most recent answers from prior applications as context to AI_Client to maintain answer consistency across applications.
5. THE Extension SHALL display generated answers in its side-panel and allow the user to review and edit each answer before form filling.

---

### Requirement 8: Form Fill Assistance

**User Story:** As a job seeker on an application form, I want the extension to automatically fill in form fields with my answers, so that I can submit applications quickly.

#### Acceptance Criteria

1. WHEN a user is on a supported job application form page and clicks fill, THE Extension SHALL detect form fields in the page DOM and populate each detected field with the corresponding approved answer.
2. THE Extension SHALL allow the user to review all answers in the side-panel before triggering any form fill.
3. WHEN the Extension fills a form field, THE Extension SHALL do so by setting the field value and dispatching the appropriate DOM events to ensure the form's own validation logic is triggered.

---

### Requirement 9: Application Record Management

**User Story:** As a job seeker, I want to save a record of each job application I submit, so that I can track my progress across all applications.

#### Acceptance Criteria

1. WHEN an authenticated user submits a valid application payload to `POST /api/applications`, THE API SHALL create an Application record and return a 201 response with the created Application.
2. THE Application record SHALL default to status `'draft'` when no status is provided.
3. THE Application record SHALL accept and store the following status values: `'draft'`, `'submitted'`, `'interviewing'`, `'offered'`, `'rejected'`, `'withdrawn'`.
4. WHEN an authenticated user submits a status update to `PATCH /api/applications/:id`, THE API SHALL update the Application's status.
5. IF the referenced `jobId` or `cvId` does not belong to the authenticated user, THEN THE API SHALL return a 403 Forbidden response.
6. THE API SHALL validate the application payload against the `createApplicationSchema` Zod schema and return 400 for invalid payloads.
7. THE Extension SHALL allow the user to save an application record immediately after reviewing answers, linking the job, CV, tailored CV, analysis, and answers.

---

### Requirement 10: Application Dashboard and Tracking

**User Story:** As a job seeker, I want a dashboard where I can see all my applications and their current status, so that I can manage my job search pipeline.

#### Acceptance Criteria

1. WHEN an authenticated user requests `GET /api/applications`, THE API SHALL return a paginated list of Applications belonging to that user.
2. WHEN an authenticated user requests `GET /api/applications/:id`, THE API SHALL return the full ApplicationDetail including the linked job, CV, analysis, tailored CV, and answers.
3. THE Dashboard SHALL provide an application list page showing each application's job title, company, status, and submission date.
4. THE Dashboard SHALL provide an application detail page showing the full application timeline, all answers with their source labels, and links to the associated job and CV.
5. THE Dashboard SHALL allow the user to update an application's status from the detail page.

---

### Requirement 11: Extension Authentication State

**User Story:** As a user of the browser extension, I want the extension to reflect my login state, so that I am prompted to authenticate when needed and can use all features when signed in.

#### Acceptance Criteria

1. WHEN the Extension detects no stored auth token in `chrome.storage.local`, THE Extension SHALL display a "Sign in to ApplyFlow" prompt containing a link to the Dashboard login page.
2. WHEN the Extension detects an expired auth token, THE Extension SHALL display the same unauthenticated prompt.
3. WHEN a user authenticates through the Dashboard, THE Extension SHALL detect the updated token from `chrome.storage.local` without requiring a manual refresh.
4. WHILE the Extension is in an unauthenticated state, THE Extension SHALL not send any API requests that require authentication.

---

### Requirement 12: Extension Side-Panel UI States

**User Story:** As a user of the browser extension, I want clear visual feedback about what the extension is doing at every stage, so that I am never confused about the current state of my application.

#### Acceptance Criteria

1. THE Extension UI SHALL display one of the following states: `idle`, `detecting`, `analyzing`, `ready`, or `error`.
2. WHEN the Extension is actively calling the API, THE Extension SHALL display a progress indicator and transition to the appropriate state.
3. WHEN an API call returns an error, THE Extension SHALL display the `error` state with a human-readable message.
4. WHEN the Extension reaches the `ready` state, THE Extension SHALL present the compatibility score, tailored CV preview, and generated answers together in the side-panel.

---

### Requirement 13: AI Error Handling and Retry

**User Story:** As a user, I want the system to gracefully handle AI service disruptions so that temporary outages do not permanently fail my requests.

#### Acceptance Criteria

1. WHEN the AI_Client receives a 429 or 5xx response from the OpenAI API, THE API SHALL retry the request up to three times using exponential backoff with delays of 1 s, 2 s, and 4 s.
2. IF all three retry attempts fail, THEN THE API SHALL return a 503 response with `{ error: 'ai_unavailable', retryAfter: 30 }`.
3. THE API SHALL log each failed AI call attempt, including the error type and attempt number.

---

### Requirement 14: Rate Limiting on AI-Heavy Endpoints

**User Story:** As a system operator, I want per-user rate limits on expensive AI operations, so that individual users cannot exhaust the AI API budget or degrade service for others.

#### Acceptance Criteria

1. THE API SHALL enforce a limit of 10 compatibility analysis requests per user per hour on `POST /api/analyze`.
2. THE API SHALL enforce a limit of 5 CV tailoring requests per user per hour on `POST /api/cvs/tailor`.
3. IF a user exceeds a rate limit, THEN THE API SHALL return a 429 Too Many Requests response with a `Retry-After` header indicating when the limit resets.

---

### Requirement 15: Authorization and Data Isolation

**User Story:** As a user, I want assurance that I can only access my own data, so that my personal and professional information remains private.

#### Acceptance Criteria

1. THE API SHALL scope every database query on user-owned resources (CVs, jobs, analyses, tailored CVs, applications) with a `WHERE userId = :authenticatedUserId` clause.
2. IF a request attempts to read or modify a resource belonging to a different user, THEN THE API SHALL return a 403 Forbidden response.
3. THE API SHALL store each user's S3 files under a user-scoped key prefix so that object keys of one user are not accessible to another.
4. WHEN the API generates a presigned S3 URL, THE API SHALL scope it to the specific object key and set an expiry of 15 minutes.

---

### Requirement 16: CV File Access via Presigned URLs

**User Story:** As a user, I want to download my uploaded CV files, so that I can verify what was stored and retrieve them later.

#### Acceptance Criteria

1. WHEN an authenticated user requests a download URL for a CV, THE API SHALL generate and return an S3 presigned URL scoped to that CV's storage key.
2. THE presigned URL SHALL expire within 15 minutes of generation.
3. THE Dashboard SHALL provide a direct download link for each uploaded CV using a presigned URL.

---

### Requirement 17: Input Validation via Shared Schemas

**User Story:** As a developer, I want all API inputs validated against shared Zod schemas, so that invalid data never reaches the business logic layer and schema changes are reflected across all consumers automatically.

#### Acceptance Criteria

1. THE Shared package SHALL export Zod schemas for CV upload, job extraction, compatibility analysis, CV tailoring, answer generation, and application creation.
2. THE API SHALL validate all incoming request bodies against the corresponding Shared schema and return a 400 response with structured field-level error details if validation fails.
3. THE Dashboard and Extension SHALL import types and schemas from the Shared package rather than defining their own.

---

### Requirement 18: Monorepo Build and Development Workflow

**User Story:** As a developer, I want a consistent monorepo build and development setup, so that I can run, test, and build all packages and apps from a single root command.

#### Acceptance Criteria

1. THE System SHALL be structured as a pnpm workspace with `apps/api`, `apps/web`, `apps/extension`, `packages/shared`, `packages/ai`, `packages/cv-parser`, and `packages/job-analyzer`.
2. THE System SHALL use Turborepo for task orchestration, enabling parallel builds and incremental task caching.
3. WHEN a developer runs the monorepo build command from the root, THE System SHALL build all packages before building the apps that depend on them.
4. THE System SHALL use Vitest as the test runner across all packages and apps.
5. THE System SHALL use ESLint with `typescript-eslint` and Prettier for consistent code style enforcement.

---

### Requirement 19: Database Schema and Migrations

**User Story:** As a developer, I want the database schema to be managed through Prisma migrations, so that schema changes are versioned, reproducible, and safe to apply.

#### Acceptance Criteria

1. THE API SHALL use Prisma as the ORM for all database interactions with PostgreSQL.
2. THE System SHALL define the full data model in a Prisma schema file covering the User, UserProfile, CV, Job, CompatibilityAnalysis, TailoredCV, and Application models.
3. THE API SHALL apply pending Prisma migrations on startup in production environments.
4. THE database SHALL have indexes on `(userId, createdAt)` for the Job and Application tables to support efficient user-scoped list queries.

---

### Requirement 20: Performance and Scalability Constraints

**User Story:** As a user, I want the system to remain responsive even for large files and slow AI responses, so that my experience is not degraded by processing bottlenecks.

#### Acceptance Criteria

1. WHEN a CV file exceeds 2 MB, THE API SHALL offload PDF/DOCX parsing to a Node.js worker thread to avoid blocking the event loop.
2. THE Extension SHALL display a streaming progress indicator while awaiting AI-generated results.
3. THE API SHALL cache CompatibilityAnalysis results for a given `(cvId, jobId)` pair for 1 hour and return the cached result on repeated requests within that window.
4. WHEN the tailored CV prompt exceeds the `gpt-4o` context window, THE API SHALL fall back to `gpt-4o-mini` for that request.
5. THE Dashboard SHALL use presigned S3 URLs for CV uploads from the browser, sending the file directly to S3 and using the API only for metadata handling.

---

### Requirement 21: Security and Secrets Management

**User Story:** As a system operator, I want the system to follow security best practices, so that user data and API credentials are protected.

#### Acceptance Criteria

1. THE API SHALL treat all job description text and CV text as untrusted user data and place it exclusively in the user/assistant turns of AI prompts, never in the system prompt.
2. THE System SHALL inject all secrets (OpenAI API key, S3 credentials, database connection string, JWT secret) exclusively via environment variables and SHALL NOT commit secrets to source code or configuration files.
3. THE API SHALL verify uploaded file types by reading file magic bytes in addition to checking the declared Content-Type header.
4. THE System SHALL store JWT refresh tokens in `httpOnly` cookies to prevent client-side JavaScript access.
