import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SmoothScroll from "@/components/landing/SmoothScroll";

/* F1.6 marketing layout: header + footer + single smooth-scroll.
   Sections render full width; each owns an inner <Container/>. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
