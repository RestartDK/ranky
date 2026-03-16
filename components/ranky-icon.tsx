export function RankyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <rect width="32" height="32" fill="currentColor" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="18"
        fill="#FFF"
      >
        R
      </text>
    </svg>
  );
}
