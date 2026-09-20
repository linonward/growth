import type { SVGProps } from "react";

/**
 * Hand-drawn line icon set.
 *
 * Replaces the emoji that used to be the app's chrome (spec section 20 warns
 * against a screen full of emoji). Every glyph is a 24x24 stroke drawing using
 * `currentColor`, so icons inherit the surrounding text colour and stay visually
 * consistent — which raw emoji never were, since each emoji ships its own
 * weight, size and palette.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- navigation */

/** 世界 — a small globe with a meridian. */
export function IconWorld(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18Z" />
      <path d="M5.2 6.4c1.9 1.3 11.7 1.3 13.6 0" />
      <path d="M5.2 17.6c1.9-1.3 11.7-1.3 13.6 0" />
    </Svg>
  );
}

/** 今日 — a rounded task card with a tick. */
export function IconToday(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x={3.5} y={4.5} width={17} height={16} rx={4} />
      <path d="M8 12.2l2.6 2.6L16.4 9" />
    </Svg>
  );
}

/** 伙伴 — a paw print. */
export function IconPaw(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx={12} cy={15.6} rx={4.6} ry={3.7} />
      <ellipse cx={6.4} cy={10.2} rx={2.1} ry={2.7} />
      <ellipse cx={10.2} cy={6.6} rx={2.1} ry={2.7} />
      <ellipse cx={15.4} cy={7} rx={2.1} ry={2.7} />
      <ellipse cx={18.6} cy={11.2} rx={2.1} ry={2.7} />
    </Svg>
  );
}

/** 成长 — a sprout with two leaves. */
export function IconSprout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21v-8.2" />
      <path d="M12 12.8C12 9.6 9.4 7 6.2 7c0 3.2 2.6 5.8 5.8 5.8Z" />
      <path d="M12 12.8c0-3.6 2.9-6.5 6.5-6.5 0 3.6-2.9 6.5-6.5 6.5Z" />
    </Svg>
  );
}

/* ------------------------------------------------------------ goal categories */

/** 阅读 — an open book. */
export function IconBook(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 7.4C10.3 5.9 8 5.2 4.6 5.4v11.4c3.4-.2 5.7.5 7.4 2 1.7-1.5 4-2.2 7.4-2V5.4c-3.4-.2-5.7.5-7.4 2Z" />
      <path d="M12 7.4v11.4" />
    </Svg>
  );
}

/** 专注学习 — a pencil. */
export function IconPencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16.2 4.6l3.2 3.2-10 10-4.1.9.9-4.1Z" />
      <path d="M14.4 6.4l3.2 3.2" />
    </Svg>
  );
}

/** 运动 — a running figure. */
export function IconRun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx={15.4} cy={4.9} r={1.9} />
      <path d="M13.6 9.2 10.2 11l1.5 3.1-2.4 5.3" />
      <path d="M13.6 9.2 17 11l1.2 3.4" />
      <path d="M11.7 14.1l-4.9.5" />
      <path d="M8.2 8.4l3.6.6" />
    </Svg>
  );
}

/** 练习一个兴趣 — an artist's palette. */
export function IconPalette(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c-4.7 0-8.5 3.5-8.5 7.9 0 3.6 2.9 5.6 5.3 5.6 1.6 0 2.3-.9 2.3-1.8 0-1.4-1.4-1.6-1.4-2.7 0-.9.8-1.6 1.9-1.6h1.8c2.6 0 4.6-1.9 4.6-4 0-2-2.4-3.4-6-3.4Z" />
      <circle cx={8} cy={9.4} r={1.05} fill="currentColor" stroke="none" />
      <circle cx={12.2} cy={7.2} r={1.05} fill="currentColor" stroke="none" />
      <circle cx={16.3} cy={9.4} r={1.05} fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** 帮助家人 — a heart. */
export function IconHeart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19.4c-1.1-.9-6.8-4.7-6.8-9A3.9 3.9 0 0 1 12 7.7a3.9 3.9 0 0 1 6.8 2.7c0 4.3-5.7 8.1-6.8 9Z" />
    </Svg>
  );
}

/* -------------------------------------------------------------- plant stages */

/** Stage 1 — a sprouting seed. */
export function IconStageSprout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20v-6.5" />
      <path d="M12 13.5C12 11 10 9 7.5 9c0 2.5 2 4.5 4.5 4.5Z" />
      <path d="M12 13.5c0-2.5 2-4.5 4.5-4.5 0 2.5-2 4.5-4.5 4.5Z" />
      <path d="M8.5 20h7" />
    </Svg>
  );
}

/** Stage 2 — a leafy plant. */
export function IconStageLeaf(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20V8" />
      <path d="M12 12.5C12 9.5 9.7 7.2 6.7 7.2c0 3 2.3 5.3 5.3 5.3Z" />
      <path d="M12 10c0-3 2.3-5.3 5.3-5.3 0 3-2.3 5.3-5.3 5.3Z" />
      <path d="M12 16.5c0-2.4 1.9-4.3 4.3-4.3 0 2.4-1.9 4.3-4.3 4.3Z" />
    </Svg>
  );
}

/** Stage 3 — a tree. */
export function IconStageTree(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20v-5" />
      <path d="M9.5 15h5" />
      <path d="M12 4.2c3.3 0 6 2.5 6 5.4 0 2-1.2 3.4-2.6 4.2H8.6C7.2 13 6 11.6 6 9.6c0-2.9 2.7-5.4 6-5.4Z" />
    </Svg>
  );
}

/** Stage 4 — a blossoming tree. */
export function IconStageBloom(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20v-5" />
      <path d="M9.5 15h5" />
      <path d="M12 4.6c2.6 0 4.7 2 4.7 4.3 0 1.6-.9 2.7-2 3.4H9.3c-1.1-.7-2-1.8-2-3.4 0-2.3 2.1-4.3 4.7-4.3Z" />
      <circle cx={6.6} cy={6.6} r={1.8} />
      <circle cx={17.4} cy={6.6} r={1.8} />
      <circle cx={12} cy={3.4} r={1.8} />
    </Svg>
  );
}

/* ---------------------------------------------------------------------- misc */

export function IconCheck(props: IconProps) {
  return (
    <Svg strokeWidth={2.3} {...props}>
      <path d="M5 12.6l4.4 4.3L19 7.4" />
    </Svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />
      <path d="M14.6 5.4l3 3" />
    </Svg>
  );
}

/** Four-point sparkle, used for "energy" and celebration. */
export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c.7 4.2 2.3 5.8 6.5 6.5-4.2.7-5.8 2.3-6.5 6.5-.7-4.2-2.3-5.8-6.5-6.5 4.2-.7 5.8-2.3 6.5-6.5Z" />
      <path d="M18.4 16.2c.3 1.7 1 2.4 2.6 2.6-1.6.3-2.3 1-2.6 2.6-.3-1.6-1-2.3-2.6-2.6 1.6-.2 2.3-.9 2.6-2.6Z" />
    </Svg>
  );
}

/** The pet, at a glance — used as the "energy flows into the world" glyph. */
export function IconWorldDrop(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.8c3.6 3.4 6.2 6.5 6.2 9.6A6.2 6.2 0 0 1 5.8 13.4c0-3.1 2.6-6.2 6.2-9.6Z" />
      <path d="M9.4 13.2a2.6 2.6 0 0 0 2.6 2.6" />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x={5} y={10.5} width={14} height={9.5} rx={3} />
      <path d="M8.6 10.5V8.2a3.4 3.4 0 0 1 6.8 0v2.3" />
    </Svg>
  );
}

/** The day marker in the world header. */
export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx={12} cy={12} r={4.4} />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2" />
      <path d="M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
    </Svg>
  );
}

/** Category → icon, used by the goals list and the plant record. */
export const CATEGORY_ICON = {
  reading: IconBook,
  study: IconPencil,
  exercise: IconRun,
  interest: IconPalette,
  helping: IconHeart,
} as const;
