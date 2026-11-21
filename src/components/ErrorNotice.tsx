import styles from "./ErrorNotice.module.css";

/** An announced error with a way to try the failed step again. */
export function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.notice} role="alert">
      <p>{message}</p>
      <button type="button" className="button-outline" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
