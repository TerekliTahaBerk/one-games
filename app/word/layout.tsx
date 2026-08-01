import { redirect } from "next/navigation";
import { getAccessState } from "@/lib/access/session";

export const dynamic = "force-dynamic";
export default async function WordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAccessState();
  if (!access.allowed) redirect("/play?game=word");
  return children;
}
