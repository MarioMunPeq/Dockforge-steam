type IconoMandoProps = {
  size?: number
  className?: string
}

/** Icono de mando usado en los estados vacíos. */
export default function IconoMando({
  size = 24,
  className,
}: IconoMandoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7.6 7.2h8.8c2.9 0 4.4 2.2 4.8 5.3l.6 4.1c.2 1.5-1.4 2.6-2.8 2.2l-2.2-.6a3 3 0 0 0-1.5.1l-1.4.5a6.1 6.1 0 0 1-3.9 0l-1.4-.5a3 3 0 0 0-1.5-.1l-2.2.6c-1.4.4-3-.7-2.8-2.2l.6-4.1c.4-3.1 2-5.3 4.9-5.3Z" />
      <path d="M8 10v3.6M6.2 11.8h3.6" />
      <circle cx="15.7" cy="10.7" r=".85" fill="currentColor" stroke="none" />
      <circle cx="18.3" cy="13" r=".85" fill="currentColor" stroke="none" />
      <path d="M10.2 5.1V3.9M13.8 5.1V3.9" />
    </svg>
  )
}
