import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OneWord Archive",
  description:
    "Replay every published OneWord puzzle without changing today’s streak.",
};
export default function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
