export type WorkMode = 'On-site' | 'Hybrid' | 'Remote'

export type JobType = 'Full time' | 'Part time' | 'Contract'

export type SkillLevel = 'Required' | 'Preferred' | 'Optional'

export type AnswerKind = 'Yes or no' | 'Short answer'

export interface Ask {
  name: string
  level: string
}

export interface Question {
  text: string
  kind: AnswerKind
  required: boolean
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  mode: WorkMode
  type: JobType
  posted_at: string
  about: string[]
  years: string
  skills: Ask[]
  languages: Ask[]
  questions: Question[]
}
