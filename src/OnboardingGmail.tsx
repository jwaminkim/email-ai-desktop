import React, { useState } from "react";
import { theme } from "./theme";
import { IconSparkle } from "./icons";

const { color } = theme;

export default function OnboardingGmail({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setStatus("loading");
    setError("");
    try {
      await window.api.gmailAuth();
      onDone();
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "100px auto", textAlign: "center" }}>
      <IconSparkle size={28} style={{ color: color.accent, marginBottom: 12 }} />
      <h2 style={{ fontSize: 20, fontWeight: 750, color: color.text, margin: "0 0 12px" }}>1단계 — Gmail 로그인</h2>
      <p style={{ color: color.muted, fontSize: 14, lineHeight: 1.7 }}>
        이메일을 분석하고 답장을 보내려면 먼저 Gmail 계정으로 로그인해야 합니다.
        <br />
        버튼을 누르면 브라우저가 열리고, 평소 구글 로그인하듯 계정을 선택하고 권한을 허용하면 됩니다.
      </p>

      <button
        onClick={handleLogin}
        disabled={status === "loading"}
        style={{
          marginTop: 16,
          padding: "11px 24px",
          borderRadius: theme.radius.pill,
          border: `1px solid ${color.accent}`,
          background: color.accent,
          color: "#fff",
          fontSize: 13.5,
          fontWeight: 650,
        }}
      >
        {status === "loading" ? "로그인 창을 여는 중..." : "Gmail로 로그인"}
      </button>

      {status === "error" && (
        <p style={{ color: color.danger, fontSize: 13, marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
}
