interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = "", width = 192, height = 40 }: LogoProps) {
  return (
    <img
      src="/lakat-logo-white.png"
      alt="Lakat Iloilo"
      width={width}
      height={height}
      className={className}
    />
  );
}
