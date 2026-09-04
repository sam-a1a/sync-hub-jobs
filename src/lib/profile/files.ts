/*
 * What a CV file is allowed to be — the platform's own rules, restated so a
 * file it would refuse is refused here, in the same words, before it is sent.
 */
export const MAX_CV_BYTES = 10 * 1024 * 1024
export const MAX_CV_MB = MAX_CV_BYTES / (1024 * 1024)
export const CV_FORMATS = 'PDF, DOC or DOCX'

const EXTENSIONS = ['.pdf', '.doc', '.docx']

export const CV_FILE_ACCEPT = EXTENSIONS.join(',')

export function rejectionFor(file: File): string | null {
  const name = file.name.toLowerCase()
  if (!EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return `A CV has to be a ${CV_FORMATS} file.`
  }
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_CV_BYTES) return `That file is larger than ${MAX_CV_MB} MB. Try a smaller one.`
  return null
}
