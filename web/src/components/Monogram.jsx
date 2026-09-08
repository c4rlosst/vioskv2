/**
 * A stand-in mark for a business that hasn't uploaded a logo yet: its own
 * initial, in the business's accent colour. Beats showing the Viosk chevron,
 * which tells a guest nothing about whose shop they're sitting in.
 */
export default function Monogram({ name, className = '' }) {
  // "Lola Remy Lutong Bahay" -> L, "AKANAN" -> A. Skip anything that isn't a
  // letter or digit so "@Kape" or a leading quote doesn't become the mark.
  const letter =
    [...(name ?? '')].find((c) => /[\p{L}\p{N}]/u.test(c))?.toUpperCase() ?? '?'

  return (
    <span className={`monogram ${className}`} role="img" aria-label={name ?? 'Logo'}>
      <span aria-hidden="true">{letter}</span>
    </span>
  )
}
