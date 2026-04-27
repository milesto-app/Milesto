import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e8e5df] py-8">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <nav className="mb-4 flex justify-center gap-6">
          <Link
            href="/support"
            className="text-sm text-[#6b6b6b] transition-colors hover:text-[#2D5016]"
          >
            Support
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-[#6b6b6b] transition-colors hover:text-[#2D5016]"
          >
            Privacy
          </Link>
          <a
            href="mailto:support@milesto-ai.app"
            className="text-sm text-[#6b6b6b] transition-colors hover:text-[#2D5016]"
          >
            Contact
          </a>
        </nav>
        <p className="text-xs text-[#999]">
          &copy; 2025 Milesto. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
