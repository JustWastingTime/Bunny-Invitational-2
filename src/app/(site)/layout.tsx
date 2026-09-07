import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--accent-solid)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--accent-on-solid)]"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="page-shell flex-1 py-8 lg:py-10">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
