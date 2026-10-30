import AppShell from "@/components/app/AppShell";
import { getServerSession } from "@/lib/session-server";

/* F1.6 app layout: sidebar/topbar shell for signed-in screens. */
/* F2.5: session resolved once here and passed down (no client refetch). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerSession();
  return <AppShell me={me}>{children}</AppShell>;
}
