import Morph from './Morph'

/**
 * A number whose digits roll, one column at a time.
 *
 * Each character gets its own {@link Morph} keyed on the character itself, so a
 * column only moves when *that* column changes: 60 to 59 rolls both, 59 to 58
 * rolls only the units. Rolling the whole number as one string makes the reader
 * re-read it to find out what is different, which is the thing a counter should
 * never ask.
 *
 * The site's `MorphLabel` reaches the same place from the other direction — it
 * measures the head and tail every label shares and rolls only the middle. Per
 * character is the same idea for a string that is all digits, without needing
 * to know the whole set in advance.
 */
function Counter({ value }: { value: number }) {
  const digits = String(value).split('')

  return (
    <span className="inline-flex tabular-nums">
      {digits.map((digit, index) => (
        /*
         * Keyed by position, not by digit. The key marks *which column* this
         * is; the token inside is what tells the Morph the column changed.
         */
        <Morph key={`${digits.length}-${index}`} token={digit}>
          {digit}
        </Morph>
      ))}
    </span>
  )
}

export default Counter
