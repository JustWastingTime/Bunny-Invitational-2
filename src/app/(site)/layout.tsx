import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="page-shell flex-1 py-8 lg:py-10">{children}</main>
      <SiteFooter />
    </>
  );
}
