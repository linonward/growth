"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconPaw, IconSprout, IconToday, IconWorld } from "@/components/ui/icons";

const ITEMS = [
  { href: "/", label: "世界", Icon: IconWorld, testId: "nav-world" },
  { href: "/goals", label: "今日", Icon: IconToday, testId: "nav-goals" },
  { href: "/pet", label: "伙伴", Icon: IconPaw, testId: "nav-pet" },
  { href: "/plant", label: "成长", Icon: IconSprout, testId: "nav-plant" },
] as const;

/**
 * The only four navigation entries (spec section 2).
 *
 * Icons are drawn in-house rather than emoji: four emoji each ship their own
 * weight, size and palette, which never reads as a designed system. These share
 * one stroke weight and inherit `currentColor`, so the active state tints the
 * whole glyph.
 *
 * The bar is a flex sibling of the scrolling page area, so it stays pinned to
 * the bottom of the app frame without needing `position: fixed`.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="z-20 shrink-0 border-t border-sand-deep/50 bg-cream/92 backdrop-blur-md"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -6px 20px -12px rgb(120 98 70 / 0.35)",
      }}
      aria-label="主导航"
      data-testid="bottom-nav"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex flex-1 p-1.5">
              <Link
                href={item.href}
                data-testid={item.testId}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className={`tap-target relative w-full flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[11px] transition-colors duration-200 ${
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
                <item.Icon size={21} className="relative" />
                <span className="relative leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
