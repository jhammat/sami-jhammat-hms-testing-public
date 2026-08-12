import Image from "next/image";

interface WonFlowLogoProps {
  compact?: boolean;
  className?: string;
}

export function WonFlowLogo({
  compact = false,
  className = "",
}: WonFlowLogoProps) {
  if (compact) {
    return (
      <div
        className={[
          "relative h-11 w-11",
          "shrink-0 overflow-hidden",
          className,
        ].join(" ")}
      >
        <Image
          alt="WonFlow"
          className="object-cover object-center"
          fill
          priority
          sizes="44px"
          src="/brand/wonflow-mark.png"
        />
      </div>
    );
  }

  return (
    <div
      className={[
        "relative h-[56px]",
        "w-[188px] shrink-0 overflow-hidden",
        className,
      ].join(" ")}
    >
      <Image
        alt="WonFlow Hospital Platform"
        className="object-cover object-[center_43%]"
        fill
        priority
        sizes="188px"
        src="/brand/wonflow-logo.png"
      />
    </div>
  );
}
