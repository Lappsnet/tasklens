import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SmoothScroll from "@/components/landing/SmoothScroll";
import { getServerSession } from "@/lib/session-server";

/* F1.6 marketing layout: header + footer + single smooth-scroll.
   Sections render full width; each owns an inner <Container/>. */
/* F2.5: session resolved once here and passed down (no client refetch). */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerSession();
  return (
    <>
      <SmoothScroll />
      <SiteHeader me={me} />
      {children}
      <SiteFooter />
    </>
  );
}
