import Link from "next/link";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand-logo" aria-label="OneGames home">
      <span>One</span><em>Games</em>
    </Link>
  );
}
