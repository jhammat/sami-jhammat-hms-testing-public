import Image from "next/image";

interface WonFlowBrandMarkProps {
  size?: number;
  className?: string;
}

export function WonFlowBrandMark({
  size = 42,
  className = "",
}: WonFlowBrandMarkProps) {
  return (
    <div
      className={["relative inline-block shrink-0 overflow-hidden", className].join(" ")}
      style={{ width: size, height: size }}
    >
      <Image
        alt="WonFlow"
        className="object-contain"
        fill
        priority
        sizes={`${size}px`}
        src="/brand/wonflow-mark.png"
      />
    </div>
  );
}