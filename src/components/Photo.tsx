import Image from "next/image";
import type { PhotoInfo } from "@/lib/photos";
import styles from "./Photo.module.css";

interface Props {
  photo: PhotoInfo;
  caption?: string;
  /** Responsive sizes hint for the image optimiser. */
  sizes?: string;
  priority?: boolean;
  variant?: "banner" | "inline";
}

/** A captioned, optimised photograph with its licence credit. */
export function Photo({ photo, caption, sizes = "(max-width: 900px) 100vw, 50vw", priority = false, variant = "inline" }: Props) {
  return (
    <figure className={styles.figure} data-variant={variant}>
      <div className={styles.frame}>
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes={sizes}
          priority={priority}
          className={styles.img}
        />
      </div>
      <figcaption className={styles.caption}>
        {caption && <span>{caption}</span>}
        <span className={styles.credit}>
          Photo:{" "}
          <a href={photo.sourceUrl} rel="noopener noreferrer" target="_blank">
            {photo.credit}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          ,{" "}
          <a href={photo.licenseUrl} rel="noopener noreferrer license" target="_blank">
            {photo.license}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
