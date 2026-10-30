import AppShell from "@/components/app/AppShell";

/* F1.6 app layout: sidebar/topbar shell for signed-in screens. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
