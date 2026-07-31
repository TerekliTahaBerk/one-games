import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

export function Header() {
  return (
    <header className="ecosystem-header">
      <Link href="/" className="back-link" aria-label="Back to OneGames">← <span>Back</span></Link>
      <BrandLogo />
    </header>
  );
}
