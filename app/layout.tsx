import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: {
      default: "OneGames — One good game at a time",
      template: "%s — OneGames",
    },
    description:
      "A quiet home for thoughtful daily games. Start with today’s OneSudoku.",
    applicationName: "OneGames",
    manifest: "/manifest.webmanifest",
    alternates: { canonical: "/" },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      title: "OneGames — One good game at a time",
      description: "A quiet home for thoughtful daily games.",
      siteName: "OneGames",
      images: [{ url: "/og.png", width: 1734, height: 907, alt: "OneGames — One good game at a time" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "OneGames — One good game at a time",
      description: "A quiet home for thoughtful daily games.",
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f3f0e7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
