import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Next.js App Router `<Link>` + `href` that includes `#` can break prefetch / soft navigation
 * (users sometimes see the tab hang, then "connection refused" if the dev server exits).
 * Same-origin paths with a hash use a normal `<a>` so the browser does a full document load.
 */
export function HashSafeLink({ href, children, ...rest }: Props) {
  if (href.includes("#")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
