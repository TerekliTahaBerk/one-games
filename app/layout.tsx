import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { OpeningLoader } from "@/components/OpeningLoader";
import "@fontsource/fraunces/latin-400.css";
import "@fontsource/fraunces/latin-400-italic.css";
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/fraunces/latin-500-italic.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: {
      default: "OneGames — One thoughtful game at a time",
      template: "%s — OneGames",
    },
    description:
      "One daily Easy, Medium, and Hard game. One subscription for the whole OneGames family.",
    applicationName: "OneGames",
    manifest: "/manifest.webmanifest",
    alternates: { canonical: "/" },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      title: "OneGames — One thoughtful game at a time",
      description: "A small daily collection for your attention, not an endless feed.",
      siteName: "OneGames",
      images: [{ url: "/og-v4.png", width: 1610, height: 977, alt: "OneGames — One thoughtful game at a time" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "OneGames — One thoughtful game at a time",
      description: "A small daily collection for your attention, not an endless feed.",
      images: ["/og-v4.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<OpeningLoader /></body>
    </html>
  );
}
