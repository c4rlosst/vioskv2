/** The Viosk mark: two angled strokes converging like a funnel. */
export default function Logo({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 34 26" role="img" aria-label="Viosk" focusable="false">
      <path
        d="M2 2 L17 23 L32 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 2 L17 12 L24 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  )
}
