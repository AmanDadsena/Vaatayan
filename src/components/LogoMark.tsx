import { LOGO } from "@/lib/logo";

interface Props {
  size?: number;
  className?: string;
}

/** The Vaatayan mark. Decorative: the brand name always appears next to it in text. */
export function LogoMark({ size = 40, className }: Props) {
  const c = LOGO.colors;
  return (
    <svg className={className} width={size} height={size} viewBox={LOGO.viewBox} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill={c.badge} />
      <path d={LOGO.frame} fill={c.frame} />
      <path d={LOGO.opening} fill={c.opening} />
      <circle cx="36.5" cy="28" r="4.2" fill={c.sun} />
      <path d={LOGO.windUpper} fill="none" stroke={c.windLight} strokeWidth="3.6" strokeLinecap="round" />
      <path d={LOGO.windLower} fill="none" stroke={c.windDeep} strokeWidth="3.6" strokeLinecap="round" />
      <rect x="13" y="52.5" width="38" height="4" rx="2" fill={c.frame} />
    </svg>
  );
}
