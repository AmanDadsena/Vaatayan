"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { NAV_LINKS } from "@/lib/nav";
import { LogoMark } from "./LogoMark";
import styles from "./SiteHeader.module.css";

/** Site header with the logo and the main navigation. */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      {/* The visible words form the link's name (WCAG 2.5.3), so speech users can say what they see. */}
      <Link href="/" className={styles.brand}>
        <LogoMark size={44} className={styles.mark} />
        <span className={styles.wordmark}>
          <span lang="hi" className={styles.native}>
            {BRAND.nativeName}
          </span>
          <span className={styles.latin}>{BRAND.name}</span>
        </span>
        <span className="visually-hidden">, home</span>
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
