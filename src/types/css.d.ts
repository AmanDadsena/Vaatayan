import "react";

declare module "react" {
  /** Allow CSS custom properties (e.g. `style={{ "--haze": 0.6 }}`) without casting. */
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
