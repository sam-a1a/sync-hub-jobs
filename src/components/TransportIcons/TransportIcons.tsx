/*
 * The transport controls: play, pause, replay.
 *
 * Apple's own glyphs, on their 56-unit grid. Shared by the highlights gallery
 * and the mission film — one set of transport controls in the product, so the
 * play button means the same thing wherever it turns up. They are kept as three separate
 * elements stacked on each other rather than one `<path>` whose `d` is swapped,
 * because path data only interpolates between shapes with matching node counts
 * — and these have nothing in common: one triangle, two bars, a circled arrow.
 * A swap would be a cut. Stacked, they can cross over with weight.
 */
export type Transport = 'play' | 'pause' | 'replay'

const PATHS: Record<Transport, string> = {
  play: 'm23.7555 36.6237c.4478 0 .8598-.1343 1.4241-.4568l10.9178-6.3322c.8598-.5016 1.3614-1.021 1.3614-1.8361 0-.8061-.5016-1.3255-1.3614-1.8271l-10.9178-6.3322c-.5643-.3314-.9762-.4657-1.4241-.4657-.9315 0-1.7555.7165-1.7555 1.9435v13.3629c0 1.227.824 1.9435 1.7555 1.9435z',
  pause:
    'm21.7334 36.67h2.5342c1.1483 0 1.7324-.5796 1.7324-1.7193v-13.9015c0-1.12-.5841-1.6898-1.7324-1.7193h-2.5342c-1.1483 0-1.7324.5698-1.7324 1.7193v13.9015c-.0297 1.1396.5544 1.7193 1.7324 1.7193zm9.9992 0h2.5347c1.1485 0 1.7327-.5796 1.7327-1.7193v-13.9015c0-1.12-.5842-1.7193-1.7327-1.7193h-2.5347c-1.1485 0-1.7327.5698-1.7327 1.7193v13.9015c0 1.1396.5545 1.7193 1.7327 1.7193z',
  replay:
    'm36.2448 26.6447c-1.1073 0-2.0052.8978-2.0052 2.0052 0 3.4405-2.7992 6.2397-6.2397 6.2397s-6.2397-2.7992-6.2397-6.2397 2.7992-6.2397 6.2397-6.2397c.0283 0 .0546-.0072.0825-.0083l-1.2839 1.2841c-.7833.7828-.7833 2.0526 0 2.8354.3911.3916.9047.5874 1.4177.5874s1.0266-.1958 1.4177-.5874l4.4406-4.4406c.7833-.7828.7833-2.0526 0-2.8354l-4.657-4.657c-.7823-.7833-2.0531-.7833-2.8354 0-.7833.7828-.7833 2.0526 0 2.8354l.9973.9974c-5.4561.223-9.8295 4.7189-9.8295 10.2287 0 5.6517 4.5983 10.25 10.25 10.25s10.25-4.5983 10.25-10.25c0-1.1073-.8978-2.0052-2.0052-2.0052z',
}

const ORDER: Transport[] = ['play', 'pause', 'replay']

function TransportIcons({ showing }: { showing: Transport }) {
  return (
    <span className="gallery-icons relative block size-full">
      {ORDER.map((name) => (
        <svg
          key={name}
          className="gallery-icon"
          data-shown={name === showing ? '' : undefined}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 56 56"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={PATHS[name]} />
        </svg>
      ))}
    </span>
  )
}

export default TransportIcons
