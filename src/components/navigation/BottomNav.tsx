"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "世界", icon: "🌍", testId: "nav-world" },
  { href: "/goals", label: "今日", icon: "✅", testId: "nav-goals" },
  { href: "/pet", label: "伙伴", icon: "🐾", testId: "nav-pet" },
  { href: "/plant", label: "成长", icon: "🌱", testId: "nav-plant" },
] as const;

/**
 * The only four navigation entries (spec section 2).
 *
 * The bar is a flex sibling of the scrolling page area, so it stays pinned to
 * the bottom of the app frame without needing `position: fixed`.
 *
 * The active item gets a soft leaf-coloured pill plus green semibold text. The
 * pill is absolutely positioned *inside* the link so the link itself keeps
 * filling its whole quarter of the bar and the tap target stays maximal.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="z-20 shrink-0 border-t border-sand bg-cream/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主导航"
      data-testid="bottom-nav"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex flex-1 p-1">
              <Link
                href={item.href}
                data-testid={item.testId}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className={`tap-target relative w-full flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] transition-colors duration-200 ${
                  active ? "font-semibold text-leaf-deep" : "text-ink-faint"
                }`}
              >
                <span
                  aria-hidden
                  data-testid={`${item.testId}-pill`}
                  className={`absolute inset-0 rounded-2xl transition-colors duration-200 ${
                    active ? "bg-leaf/20" : "bg-transparent"
                  }`}
                />
                <span className="relative text-[19px] leading-none" aria-hidden>
                  {item.icon}
                </span>
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
