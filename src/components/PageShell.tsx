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
