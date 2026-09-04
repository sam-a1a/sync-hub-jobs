import type { Proficiency } from './types'

/*
 * The platform's fixed lists, held here until they are read from the API's
 * reference endpoints. Every field the platform constrains is a picker over
 * one of these rather than a text box, so a profile the API would refuse
 * cannot be typed.
 */
export const ROLES: { key: string; label: string }[] = [
  { key: 'software-engineer', label: 'Software engineer' },
  { key: 'frontend-engineer', label: 'Front-end engineer' },
  { key: 'backend-engineer', label: 'Back-end engineer' },
  { key: 'mobile-engineer', label: 'Mobile engineer' },
  { key: 'data-scientist', label: 'Data scientist' },
  { key: 'data-analyst', label: 'Data analyst' },
  { key: 'product-manager', label: 'Product manager' },
  { key: 'product-designer', label: 'Product designer' },
  { key: 'ux-researcher', label: 'UX researcher' },
  { key: 'qa-engineer', label: 'QA engineer' },
  { key: 'devops-engineer', label: 'DevOps engineer' },
  { key: 'project-manager', label: 'Project manager' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'sales', label: 'Sales' },
  { key: 'customer-support', label: 'Customer support' },
  { key: 'accountant', label: 'Accountant' },
  { key: 'civil-engineer', label: 'Civil engineer' },
  { key: 'architect', label: 'Architect' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'translator', label: 'Translator' },
  { key: 'other', label: 'Other' },
]

export const LOCATIONS: { key: string; label: string }[] = [
  { key: 'damascus', label: 'Damascus' },
  { key: 'aleppo', label: 'Aleppo' },
  { key: 'homs', label: 'Homs' },
  { key: 'latakia', label: 'Latakia' },
  { key: 'hama', label: 'Hama' },
  { key: 'tartus', label: 'Tartus' },
  { key: 'idlib', label: 'Idlib' },
  { key: 'deir-ez-zor', label: 'Deir ez-Zor' },
  { key: 'raqqa', label: 'Raqqa' },
  { key: 'daraa', label: 'Daraa' },
  { key: 'as-suwayda', label: 'As-Suwayda' },
  { key: 'al-hasakah', label: 'Al-Hasakah' },
  { key: 'qamishli', label: 'Qamishli' },
  { key: 'anywhere', label: 'Anywhere, remote' },
]

export const SKILLS: string[] = [
  'TypeScript', 'JavaScript', 'React', 'Node.js', 'Python', 'Django', 'FastAPI', 'PostgreSQL',
  'SQL', 'Go', 'Rust', 'Java', 'Kotlin', 'Swift', 'Flutter', 'React Native', 'Vue', 'Angular',
  'HTML', 'CSS', 'Tailwind CSS', 'Figma', 'Product design', 'User research', 'Prototyping',
  'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Terraform', 'CI/CD', 'Git', 'Linux',
  'Machine learning', 'Data analysis', 'Pandas', 'Excel', 'Power BI', 'Tableau', 'SEO',
  'Content writing', 'Copywriting', 'Project management', 'Agile', 'Scrum', 'Accounting',
  'Bookkeeping', 'AutoCAD', 'Revit', 'Photoshop', 'Illustrator', 'Video editing', 'Translation',
]

export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'ar', name: 'Arabic' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'ku', name: 'Kurdish' },
  { code: 'fa', name: 'Persian' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hy', name: 'Armenian' },
]

export const PROFICIENCIES: { key: Proficiency; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'fluent', label: 'Fluent' },
  { key: 'native', label: 'Native' },
]

export const PHONE_COUNTRIES: { code: string; name: string; dial: string }[] = [
  { code: 'SY', name: 'Syria', dial: '+963' },
  { code: 'TR', name: 'Türkiye', dial: '+90' },
  { code: 'LB', name: 'Lebanon', dial: '+961' },
  { code: 'JO', name: 'Jordan', dial: '+962' },
  { code: 'IQ', name: 'Iraq', dial: '+964' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'QA', name: 'Qatar', dial: '+974' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
]

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const roleLabel = (key: string): string => ROLES.find((r) => r.key === key)?.label ?? ''
export const locationLabel = (key: string): string => LOCATIONS.find((l) => l.key === key)?.label ?? ''
export const languageName = (code: string): string => LANGUAGES.find((l) => l.code === code)?.name ?? code
