// 디자인 시안 B(커머셜 SaaS 방향)를 코드로 옮긴 공통 토큰. Inbox/Settings/OnboardingGmail이 공유.
export const theme = {
  font: `"Segoe UI", "Helvetica Neue", Arial, sans-serif`,
  color: {
    bg: "#ffffff",
    surface2: "#f7f7f9",
    border: "#ececf1",
    text: "#14141a",
    muted: "#6f6f7a",
    accent: "#2952e3",
    accentSoft: "#eef1fd",
    danger: "#c22b3f",
    amber: "#a5680b",
    amberSoft: "#fdf3e2",
    teal: "#0e8f7c", // "어제" 날짜그룹 강조색
  },
  radius: { sm: 8, md: 10, pill: 999 },
};

// 오늘/어제/그 이전 순으로 진하기가 옅어지는 날짜그룹 강조색 (목록 그룹 헤더용)
export function groupAccent(label: string): { text: string; border: string } {
  if (label === "오늘") return { text: theme.color.accent, border: "rgba(41,82,227,0.45)" };
  if (label === "어제") return { text: theme.color.teal, border: "rgba(14,143,124,0.4)" };
  return { text: theme.color.muted, border: theme.color.border };
}
