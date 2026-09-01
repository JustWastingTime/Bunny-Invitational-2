import { getSession, isStaffSession } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <>
      <SiteHeader staff={isStaffSession(session)} />
      <main className="page-shell flex-1 py-8 lg:py-10">{children}</main>
      <SiteFooter />
    </>
  );
}
