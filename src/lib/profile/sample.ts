import type { Application, ApplicationStage, Draft } from './types'

export function sampleDraft(name: string): Draft {
  return {
    full_name: name,
    headline: 'Full-stack engineer who ships products people use daily',
    summary:
      'Six years across fintech and marketplaces. I have taken two products from the first commit to their first hundred thousand users and led a team of four. I care most about the part of the work where a rough idea becomes something a person can hold.',
    location_key: 'damascus',
    canonical_role_key: 'software-engineer',
    is_searchable: false,
    linkedin_url: 'https://www.linkedin.com/in/sam-ghazaleh',
    github_url: 'https://github.com/samghazaleh',
    portfolio_url: '',
    phone: '944 123 456',
    phone_country: 'SY',
    experiences: [
      {
        job_title: 'Senior software engineer',
        company_name: 'Sham Pay',
        start_year: 2023,
        start_month: 3,
        end_year: null,
        end_month: null,
        is_current: true,
        description: 'Own the payments web app end to end. Rebuilt onboarding, which took sign-up completion from 41% to 68%.',
      },
      {
        job_title: 'Software engineer',
        company_name: 'Souq Al Sham',
        start_year: 2020,
        start_month: 6,
        end_year: 2023,
        end_month: 2,
        is_current: false,
        description: 'Built the seller dashboard and the search service behind the marketplace.',
      },
      {
        job_title: 'Junior developer',
        company_name: 'Freelance',
        start_year: 2018,
        start_month: 9,
        end_year: 2020,
        end_month: 5,
        is_current: false,
        description: 'Websites and small web apps for clinics, shops and one NGO.',
      },
    ],
    educations: [
      {
        institution: 'Damascus University',
        degree: 'Bachelor of Engineering',
        field_of_study: 'Informatics engineering',
        graduation_year: 2019,
      },
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'Docker', 'AWS', 'Tailwind CSS'],
    unmapped_skills: ['Team leadership', 'Mentoring'],
    languages: [
      { code: 'ar', proficiency: 'native' },
      { code: 'en', proficiency: 'fluent' },
      { code: 'de', proficiency: 'beginner' },
    ],
  }
}

const daysAgo = (days: number): string => new Date(Date.now() - days * 86400000).toISOString()

type Seed = [string, string, string, ApplicationStage, Application['outcome'], number, number]

const SEEDS: Seed[] = [
  ['Data analyst (part-time)', 'Figma', 'Homs', 'received', null, 1, 1],
  ['Senior backend engineer', 'Google', 'Damascus', 'answer', 'withdrawn', 2, 1],
  ['Frontend engineer (React)', 'Meta', 'Aleppo', 'review', null, 3, 1],
  ['DevOps engineer (contract)', 'Stripe', 'Anywhere, remote', 'review', null, 4, 2],
  ['Product designer', 'Spotify', 'Homs', 'received', null, 5, 5],
  ['Data platform engineer', 'Airbnb', 'Damascus', 'review', null, 6, 2],
  ['Mobile engineer (iOS)', 'Spotify', 'Anywhere, remote', 'answer', 'offer', 8, 3],
  ['Site reliability engineer', 'Google', 'Aleppo', 'answer', 'declined', 9, 4],
  ['Design systems engineer', 'Figma', 'Damascus', 'review', null, 10, 4],
  ['Payments integration engineer', 'Stripe', 'Damascus', 'received', null, 11, 11],
  ['Machine learning engineer', 'Meta', 'Anywhere, remote', 'review', null, 12, 5],
  ['Technical writer', 'Airbnb', 'Homs', 'answer', 'withdrawn', 13, 6],
  ['Android engineer', 'Google', 'Damascus', 'answer', 'declined', 14, 7],
  ['Growth analyst', 'Airbnb', 'Aleppo', 'received', null, 15, 15],
  ['Security engineer', 'Stripe', 'Anywhere, remote', 'review', null, 16, 6],
  ['Brand designer', 'Figma', 'Aleppo', 'answer', 'offer', 18, 8],
  ['Support engineer', 'Spotify', 'Homs', 'answer', 'declined', 19, 9],
  ['Infrastructure engineer', 'Meta', 'Damascus', 'review', null, 20, 8],
  ['Research engineer', 'Google', 'Anywhere, remote', 'received', null, 22, 22],
  ['Content strategist', 'Airbnb', 'Damascus', 'answer', 'withdrawn', 25, 12],
  ['Full-stack engineer', 'Stripe', 'Aleppo', 'answer', 'offer', 30, 13],
]

export const SAMPLE_APPLICATIONS: Application[] = SEEDS.map(
  ([job, company, location, stage, outcome, sent, moved], i) => ({
    id: `app_${i + 1}`,
    job,
    company,
    location,
    stage,
    outcome,
    sent_at: daysAgo(sent),
    moved_at: daysAgo(moved),
  }),
)
