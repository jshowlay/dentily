import type { AppProps } from "next/app";

/**
 * Minimal Pages Router shell — satisfies Next dev fallback when it looks up `/_error`
 * (App Router uses `app/`; this avoids “missing required error components” in dev).
 *
 * Do not import `app/globals.css` here: pulling App Router CSS into the Pages bundle can
 * confuse webpack chunk IDs and lead to missing `./NNN.js` runtime errors + a blank screen
 * (Next hides the body until hydration). App routes get styles from `app/layout.tsx`;
 * `pages/404` and `pages/_error` use inline styles.
 */
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
