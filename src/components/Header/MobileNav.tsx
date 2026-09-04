import { useState } from 'react'
import Icon from '../Icon'

/**
 * The bar's contents, stacked, for a screen too narrow to lay them in a row.
 *
 * No glass of its own and no card: it drops out of the bar, which has already
 * gone flat and opaque to receive it, so anything drawn here would be a second
 * surface on the first.
 *
 * Every row ends in a mark saying what it does, because on a phone there is
 * nothing else to say it — no hover to reveal a panel, no cursor to change
 * shape. A caret means this opens in place, an arrow means it goes somewhere,
 * and the box-and-arrow means it leaves the site.
 */
const FEATURES = ['Match', 'Screen', 'Automate']

/*
 * `w-fit`, not `w-full`.
 *
 * A row that fills the panel makes its whole width a target, so the wash lights
 * up when the finger is nowhere near the words and the mark at the end floats
 * a hand's width from the label it belongs to. Sizing to the content means the
 * thing you can press is the thing you can read — and the caret or arrow sits
 * against its own label rather than against the panel's edge.
 *
 * `flex` rather than `inline-flex` so each still takes its own line; the block
 * axis is unaffected by fitting the inline one.
 */
const ROW =
  'flex w-fit items-center gap-2 rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium text-ink transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)]'

function MobileNav() {
  /*
   * Collapsed to start. A menu that opens with one of its sections already
   * unpacked pushes everything else below the fold and hides the fact that
   * there is anything else.
   */
  const [featuresOpen, setFeaturesOpen] = useState(false)

  return (
    <div className="menu-panel pt-1 pb-5">
      {/*
       * Aligned to the bar's own gutter — `px-4`, the same as the row above —
       * so it starts on the same margin as the wordmark rather than on the
       * rows' inner padding.
       */}
      <p className="px-4 pb-2 text-sm font-medium text-ink-muted">Free. For everyone.</p>

      <div className="px-1">
        <button
          type="button"
          aria-expanded={featuresOpen}
          aria-controls="mobile-sync-ai"
          onClick={() => setFeaturesOpen((open) => !open)}
          className={`${ROW} cursor-pointer text-left`}
        >
          SYNC AI
          <Icon name="arrow_drop_down" size={20} className={featuresOpen ? 'rotate-180' : ''} />
        </button>

        {/*
         * The same shell mechanism the panel itself uses, nested one level.
         *
         * It works nested for a reason worth knowing: the outer shell is held
         * at `1fr` while open, so its height is simply its content's — and
         * this one's height is *animating*, so the outer follows it frame by
         * frame instead of jumping. Give this a height that changed in one
         * step and the whole menu would snap taller under the finger.
         */}
        <div
          id="mobile-sync-ai"
          className="menu-shell grid"
          data-open={featuresOpen ? '' : undefined}
          inert={!featuresOpen}
        >
          <div>
            <div className="mb-1 ml-3 border-l border-ink/10 pl-3 dark:border-white/10">
              {FEATURES.map((feature) => (
                <a
                  key={feature}
                  href="#"
                  className="block w-fit rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors duration-[var(--hover-fade)] ease-[var(--ease-standard)] hover:bg-[var(--hover-wash)] hover:text-ink"
                >
                  {feature}
                </a>
              ))}
            </div>
          </div>
        </div>

        <a href="#" className={ROW}>
          For Employers
          <Icon name="open_in_new" size={18} className="text-ink-muted" />
        </a>

        <a href="#" className={ROW}>
          Browse Jobs
          <Icon name="arrow_forward" size={18} className="text-ink-muted" />
        </a>
      </div>
    </div>
  )
}

export default MobileNav
