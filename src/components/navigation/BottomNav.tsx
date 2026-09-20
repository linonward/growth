"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "世界", icon: "🌍", testId: "nav-world" },
  { href: "/goals", label: "今日", icon: "✅", testId: "nav-goals" },
  { href: "/pet", label: "伙伴", icon: "🐾", testId: "nav-pet" },
  { href: "/plant", label: "成长", icon: "🌱", testId: "nav-plant" },
] as const;

/** The only four navigation entries (spec section 2). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-20 border-t border-sand bg-cream/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主导航"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                data-testid={item.testId}
                aria-current={active ? "page" : undefined}
                className={`tap-target w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                  active ? "text-leaf-deep font-semibold" : "text-ink-faint"
                }`}
              >
                <span className="text-[19px] leading-none" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
