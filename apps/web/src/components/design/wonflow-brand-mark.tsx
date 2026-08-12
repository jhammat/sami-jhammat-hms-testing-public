interface WonFlowBrandMarkProps {
  size?: number;
  className?: string;
}

export function WonFlowBrandMark({
  size = 42,
  className,
}: WonFlowBrandMarkProps) {
  return (
    <svg
      aria-label="WonFlow"
      className={className}
      height={size}
      role="img"
      viewBox="0 0 48 48"
      width={size}
    >
      <rect
        fill="#2563EB"
        height="44"
        rx="14"
        width="44"
        x="2"
        y="2"
      />

      <path
        d="M11 15.5 16.7 33 23.8 19.7 30.3 33 37 15.5"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />

      <circle
        cx="24"
        cy="11.5"
        fill="#C4B5FD"
        r="2.5"
      />
    </svg>
  );
}