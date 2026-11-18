import React, { useEffect, useState } from "react";
import OnboardingGmail from "./OnboardingGmail";
import Settings from "./Settings";
import Inbox from "./Inbox";
import { theme } from "./theme";

const { color } = theme;

type Screen = "loading" | "gmail-login" | "model-setup" | "inbox" | "settings-modal";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");

  const checkStatus = async () => {
    const status = await window.api.getOnboardingStatus();
    if (!status.gmailAuthed) setScreen("gmail-login");
    else if (!status.providerConfigured) setScreen("model-setup");
    else setScreen("inbox");
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (screen === "loading") {
    return <p style={{ padding: 24, color: color.muted, fontSize: 13 }}>불러오는 중...</p>;
  }

  if (screen === "gmail-login") {
    return <OnboardingGmail onDone={checkStatus} />;
  }

  if (screen === "model-setup") {
    return <Settings onDone={checkStatus} />;
  }

  if (screen === "settings-modal") {
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <button
          onClick={() => setScreen("inbox")}
          style={{
            marginBottom: 16,
            padding: "8px 16px",
            borderRadius: theme.radius.pill,
            border: `1px solid ${color.border}`,
            background: color.bg,
            color: color.text,
            fontSize: 13,
            fontWeight: 650,
          }}
        >
          ← 받은메일로 돌아가기
        </button>
        <Settings onDone={() => setScreen("inbox")} />
      </div>
    );
  }

  return <Inbox onOpenSettings={() => setScreen("settings-modal")} />;
}
