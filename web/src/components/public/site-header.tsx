import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[#e8e5df]">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#2D5016]"
        >
          Momentum
        </Link>
        <nav className="flex gap-6">
          <Link
            href="/support"
            className="text-sm text-[#4a4a4a] transition-colors hover:text-[#2D5016]"
          >
            Support
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-[#4a4a4a] transition-colors hover:text-[#2D5016]"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </header>
  );
}
