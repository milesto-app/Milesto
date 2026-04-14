import { Fraunces } from "next/font/google";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${fraunces.variable} min-h-screen bg-[#FAFAF8]`}>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}
