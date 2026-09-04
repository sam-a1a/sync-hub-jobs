export type ParsingStatus = 'uploaded' | 'processing' | 'ready' | 'failed'

export interface Cv {
  id: string
  display_name: string
  parsing_status: ParsingStatus
  parsing_error: string | null
  is_current: boolean
  created_at: string
  parsed_at: string | null
}

export type Proficiency = 'beginner' | 'intermediate' | 'advanced' | 'fluent' | 'native'

export interface Experience {
  job_title: string
  company_name: string
  start_year: number | null
  start_month: number | null
  end_year: number | null
  end_month: number | null
  is_current: boolean
  description: string
}

export interface Education {
  institution: string
  degree: string
  field_of_study: string
  graduation_year: number | null
}

export interface Language {
  code: string
  proficiency: Proficiency
}

export interface Profile {
  full_name: string
  headline: string
  summary: string
  location_key: string
  canonical_role_key: string
  is_searchable: boolean
  linkedin_url: string
  github_url: string
  portfolio_url: string
  phone: string
  phone_country: string
  experiences: Experience[]
  educations: Education[]
  skills: string[]
  unmapped_skills: string[]
  languages: Language[]
}

export type Draft = Profile

export type NotificationKind = 'cv_read' | 'cv_failed' | 'application'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  at: string
  read: boolean
}

export type ApplicationStage = 'received' | 'review' | 'answer'

export interface Application {
  id: string
  job: string
  company: string
  location: string
  stage: ApplicationStage
  outcome: 'offer' | 'declined' | 'withdrawn' | null
  sent_at: string
  moved_at: string
}

export const EMPTY_PROFILE: Profile = {
  full_name: '',
  headline: '',
  summary: '',
  location_key: '',
  canonical_role_key: '',
  is_searchable: false,
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',
  phone: '',
  phone_country: 'SY',
  experiences: [],
  educations: [],
  skills: [],
  unmapped_skills: [],
  languages: [],
}

export const EMPTY_EXPERIENCE: Experience = {
  job_title: '',
  company_name: '',
  start_year: null,
  start_month: null,
  end_year: null,
  end_month: null,
  is_current: false,
  description: '',
}

export const EMPTY_EDUCATION: Education = {
  institution: '',
  degree: '',
  field_of_study: '',
  graduation_year: null,
}
