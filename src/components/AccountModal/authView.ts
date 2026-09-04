/**
 * The three views the auth panel can be in, and the heading for each — kept
 * out of the panel's own file so that file exports nothing but a component.
 * Fast refresh works per module and gives up on any that mixes the two, which
 * means every keystroke in a half-filled form would remount it.
 */
export type View = 'signIn' | 'reset' | 'create' | 'createPassword'

export function authTitle(view: View): string {
  if (view === 'reset') return 'Password Reset'
  if (view === 'create') return 'Hello, SYNC!'
  if (view === 'createPassword') return 'Almost there!'
  return 'Back at it?'
}
