import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import styles from "./PageShell.module.css";

interface Props {
  title: string;
  lede: string;
  children: React.ReactNode;
}

/** Layout for the secondary pages: header, a page introduction, content and footer. */
export function PageShell({ title, lede, children }: Props) {
  return (
    <>
      <div className={styles.top}>
        <svg className={styles.arches} viewBox="0 0 320 420" aria-hidden="true" focusable="false">
          {[0, 1, 2, 3].map((i) => {
            const inset = i * 26;
            const w = 300 - inset * 2;
            const x = 10 + inset;
            const top = 10 + inset * 1.2;
            return (
              <path
                key={i}
                d={`M${x} 420V${top + 160}c0-60 ${w * 0.15}-94 ${w * 0.38}-118 ${w * 0.07}-7 ${w * 0.1}-18 ${w * 0.12}-42 ${w * 0.02} 24 ${w * 0.05} 35 ${w * 0.12} 42 ${w * 0.23} 24 ${w * 0.38} 58 ${w * 0.38} 118V420`}
              />
            );
          })}
        </svg>
        <div className={styles.inner}>
          <SiteHeader />
          <div className={styles.intro}>
            <h1>{title}</h1>
            <p>{lede}</p>
          </div>
        </div>
      </div>
      <main id="main" className={styles.main}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
