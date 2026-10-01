import logo from "@/assets/logo.png";

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="Prospecta Flow Robot"
      width={size}
      height={size}
      className={`rounded-lg shadow-glow ${className}`}
      style={{ width: size, height: size }}
    />
  );
}