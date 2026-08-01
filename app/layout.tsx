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

const TITLE = "OneGames — One thoughtful game at a time";
const DESCRIPTION =
  "OneSudoku, OneDna, and OneWord: calm daily games in one $1 membership.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: { default: TITLE, template: "%s — OneGames" },
    description: DESCRIPTION,
    applicationName: "OneGames",
    manifest: "/manifest.webmanifest",
    alternates: { canonical: "/" },
    icons: {
      icon: "/onegames-mark.png",
      shortcut: "/onegames-mark.png",
      apple: "/onegames-mark.png",
    },
    openGraph: {
      type: "website",
      title: TITLE,
      description: DESCRIPTION,
      siteName: "OneGames",
      url: "/",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "OneGames — One thoughtful game at a time.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fcfaf7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <OpeningLoader />
      </body>
    </html>
  );
}
