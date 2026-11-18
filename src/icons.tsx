import React from "react";

type IconProps = { size?: number; style?: React.CSSProperties };

// 디자인 시안(B)에서 쓰던 아이콘 세트를 그대로 코드로 옮김. 전부 currentColor 기반이라 색은 부모에서 제어.

export function IconInbox({ size = 16, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M2.5 12.5V5.5C2.5 4.67 3.17 4 4 4H16C16.83 4 17.5 4.67 17.5 5.5V12.5" />
      <path d="M2.5 12.5H6L7.5 15H12.5L14 12.5H17.5" />
    </svg>
  );
}

export function IconSent({ size = 16, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <polygon points="2.5,9.5 17,3 11.3,16.5 9.2,10.8" />
    </svg>
  );
}

export function IconRefresh({ size = 16, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M16 8A6 6 0 1 1 14.8 5" />
      <polyline points="13.5,3.3 16,5 14.3,7.7" />
    </svg>
  );
}

export function IconGear({ size = 16, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <circle cx="10" cy="10" r="4" />
      <path d="M16 10L18 10M14.24 14.24L15.66 15.66M10 16L10 18M5.76 14.24L4.34 15.66M4 10L2 10M5.76 5.76L4.34 4.34M10 4L10 2M14.24 5.76L15.66 4.34" />
    </svg>
  );
}

export function IconSparkle({ size = 16, style }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="currentColor" style={style}>
      <path d="M10 3L11.2 8.3L16.5 9.5L11.2 10.7L10 16L8.8 10.7L3.5 9.5L8.8 8.3Z" />
    </svg>
  );
}

export function IconPaperclip({ size = 14, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <path d="M13 4L6.7 10.3a3 3 0 0 0 4.2 4.2L17 8.4a2 2 0 0 0-2.8-2.8L8 12" />
    </svg>
  );
}

export function IconChat({ size = 15, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      style={style}
    >
      <path d="M3 4.5H17C17.55 4.5 18 4.95 18 5.5V13C18 13.55 17.55 14 17 14H8L4.5 17V14H3C2.45 14 2 13.55 2 13V5.5C2 4.95 2.45 4.5 3 4.5Z" />
    </svg>
  );
}

export function IconChevronLeft({ size = 14, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <polyline points="12,4 6,10 12,16" />
    </svg>
  );
}

export function IconChevronRight({ size = 14, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <polyline points="8,4 14,10 8,16" />
    </svg>
  );
}

export function IconSearch({ size = 15, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <circle cx="9" cy="9" r="6" />
      <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
    </svg>
  );
}

export function IconCheck({ size = 14, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <polyline points="4,10.5 8,14.5 16,5.5" />
    </svg>
  );
}

export function IconFile({ size = 14, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      style={style}
    >
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <line x1="6" y1="7" x2="14" y2="7" />
      <line x1="6" y1="10" x2="14" y2="10" />
      <line x1="6" y1="13" x2="11" y2="13" />
    </svg>
  );
}
