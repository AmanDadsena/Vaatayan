"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import styles from "./SiteHeader.module.css";

export const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/impact", label: "Impact lab" },
  { href: "/home-air", label: "Home air" },
  { href: "/why-smog", label: "Why winter smog" },
] as const;

export function Logo() {
  return (
    <span className={styles.logo} aria-hidden="true">
      <svg viewBox="0 0 32 32" width="26" height="26">
        {/* An arched jharokha window with wind passing through */}
        <path d="M9 28V15a7 7 0 0 1 14 0v13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <path
          d="M3 18c4 0 5-2 9-2s5 2 9 2 5-2 8-2M5 23c3 0 4-1.5 7-1.5s5 1.5 8 1.5 4-1.5 7-1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label={`${BRAND.name}, home`}>
        <Logo />
        <span className={styles.wordmark}>
          <span lang="hi" className={styles.native}>
            {BRAND.nativeName}
          </span>
          <span className={styles.latin}>{BRAND.name}</span>
        </span>
      </Link>
      <nav aria-label="Main" className={styles.nav}>
        <ul>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
