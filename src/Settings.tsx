import React, { useEffect, useState } from "react";
import type { ProviderSettings } from "../electron/providers/types";
import { theme } from "./theme";
import { IconRefresh } from "./icons";

const { color } = theme;

const PROVIDER_LABELS: Record<ProviderSettings["activeProvider"], string> = {
  ollama: "Ollama (로컬, 무료)",
  anthropic: "Claude (Anthropic API 키)",
  "claude-subscription": "Claude Pro/Max (구독, 개인용만)",
  openai: "GPT (OpenAI API 키)",
  gemini: "Gemini (Google API 키)",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: `1px solid ${color.border}`,
  borderRadius: 10,
  fontSize: 13.5,
  color: color.text,
  background: color.bg,
};

const iconButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  border: `1px solid ${color.border}`,
  borderRadius: 10,
  background: color.bg,
  color: color.muted,
};

// 프로바이더가 지금 실제로 제공하는 모델 목록을 매번 새로 물어와서 셀렉트박스로 보여줌.
// 목록 조회가 안 되거나(키 미입력 등) 원하는 모델이 목록에 없으면 "직접 입력"으로 전환 가능.
function ModelSelect({
  providerId,
  settings,
  value,
  onChange,
}: {
  providerId: ProviderSettings["activeProvider"];
  settings: ProviderSettings;
  value: string;
  onChange: (model: string) => void;
}) {
  const [models, setModels] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [customMode, setCustomMode] = useState(false);

  const fetchModels = async () => {
    setState("loading");
    setError("");
    try {
      const list = await window.api.listModels(providerId, settings);
      setModels(list);
      setState("idle");
      if (list.length === 0) setCustomMode(true);
    } catch (e) {
      setState("error");
      setError((e as Error).message);
      setCustomMode(true);
    }
  };

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  // 저장된 값이 목록에 없어도(예: 목록 조회 전에 이미 저장된 모델) 선택지에서 사라지지 않게 포함
  const options = value && !models.includes(value) ? [value, ...models] : models;

  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        {!customMode ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={state === "loading"}
            style={{ ...fieldStyle, flex: 1 }}
          >
            {options.length === 0 && (
              <option value="">{state === "loading" ? "불러오는 중..." : "모델 목록 없음"}</option>
            )}
            {options.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            placeholder="모델명 직접 입력"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...fieldStyle, flex: 1 }}
          />
        )}
        <button type="button" onClick={fetchModels} disabled={state === "loading"} style={iconButtonStyle} title="모델 목록 새로고침">
          <IconRefresh size={14} />
        </button>
        <button
          type="button"
          onClick={() => setCustomMode((v) => !v)}
          style={{ ...iconButtonStyle, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 600 }}
        >
          {customMode ? "목록에서 선택" : "직접 입력"}
        </button>
      </div>
      {state === "error" && <p style={{ color: color.danger, fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}

export default function Settings({ onDone }: { onDone?: () => void }) {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.api.getSettings().then(setSettings);
  }, []);

  if (!settings) return <p style={{ color: color.muted, fontSize: 13 }}>불러오는 중...</p>;

  const update = (patch: Partial<ProviderSettings>) =>
    setSettings((prev) => ({ ...(prev as ProviderSettings), ...patch }));

  const save = async () => {
    await window.api.setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
    onDone?.();
  };

  return (
    <div style={{ maxWidth: 480, margin: onDone ? "80px auto" : 0 }}>
      {onDone && (
        <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 750, color: color.text, marginBottom: 20 }}>
          2단계 — AI 모델 선택
        </h2>
      )}
      {!onDone && (
        <h3 style={{ fontSize: 16, fontWeight: 700, color: color.text, marginBottom: 16 }}>AI 모델 설정</h3>
      )}

      <select
        value={settings.activeProvider}
        onChange={(e) => update({ activeProvider: e.target.value as ProviderSettings["activeProvider"] })}
        style={{ ...fieldStyle, marginBottom: 12 }}
      >
        {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>

      {settings.activeProvider === "ollama" && (
        <>
          <input
            placeholder="Ollama 서버 주소 (기본: http://localhost:11434)"
            value={settings.ollama.baseUrl}
            onChange={(e) => update({ ollama: { ...settings.ollama, baseUrl: e.target.value } })}
            style={{ ...fieldStyle, marginBottom: 8 }}
          />
          <ModelSelect
            providerId="ollama"
            settings={settings}
            value={settings.ollama.model}
            onChange={(model) => update({ ollama: { ...settings.ollama, model } })}
          />
        </>
      )}

      {settings.activeProvider === "anthropic" && (
        <>
          <input
            placeholder="Anthropic API Key (sk-ant-...)"
            type="password"
            value={settings.anthropic.apiKey}
            onChange={(e) => update({ anthropic: { ...settings.anthropic, apiKey: e.target.value } })}
            style={{ ...fieldStyle, marginBottom: 8 }}
          />
          <ModelSelect
            providerId="anthropic"
            settings={settings}
            value={settings.anthropic.model}
            onChange={(model) => update({ anthropic: { ...settings.anthropic, model } })}
          />
        </>
      )}

      {settings.activeProvider === "claude-subscription" && (
        <>
          <div
            style={{
              background: color.amberSoft,
              border: `1px solid ${color.amber}33`,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: color.text,
              marginBottom: 10,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: color.amber }}>개인 사용 전용입니다.</strong> 다른 사람과 이 앱을 같이 쓸 때는
            이 옵션을 끄고 API 키 방식을 쓰세요.
            <br />
            사전 준비: <code>npm install -g @anthropic-ai/claude-code</code> 후{" "}
            <code>claude login</code> (1회만)
            <br />
            <span style={{ color: color.muted }}>
              ※ 이 방식은 API 키 없이 로그인 세션으로 인증하기 때문에, 모델 목록은 자동으로 최신화되지
              않는 고정 목록입니다.
            </span>
          </div>
          <ModelSelect
            providerId="claude-subscription"
            settings={settings}
            value={settings.claudeSubscription.model}
            onChange={(model) => update({ claudeSubscription: { ...settings.claudeSubscription, model } })}
          />
        </>
      )}

      {settings.activeProvider === "openai" && (
        <>
          <input
            placeholder="OpenAI API Key (sk-...)"
            type="password"
            value={settings.openai.apiKey}
            onChange={(e) => update({ openai: { ...settings.openai, apiKey: e.target.value } })}
            style={{ ...fieldStyle, marginBottom: 8 }}
          />
          <ModelSelect
            providerId="openai"
            settings={settings}
            value={settings.openai.model}
            onChange={(model) => update({ openai: { ...settings.openai, model } })}
          />
        </>
      )}

      {settings.activeProvider === "gemini" && (
        <>
          <input
            placeholder="Gemini API Key"
            type="password"
            value={settings.gemini.apiKey}
            onChange={(e) => update({ gemini: { ...settings.gemini, apiKey: e.target.value } })}
            style={{ ...fieldStyle, marginBottom: 8 }}
          />
          <ModelSelect
            providerId="gemini"
            settings={settings}
            value={settings.gemini.model}
            onChange={(model) => update({ gemini: { ...settings.gemini, model } })}
          />
        </>
      )}

      <button
        onClick={save}
        style={{
          marginTop: 18,
          padding: "10px 20px",
          borderRadius: theme.radius.pill,
          border: `1px solid ${color.accent}`,
          background: color.accent,
          color: "#fff",
          fontSize: 13,
          fontWeight: 650,
        }}
      >
        {saved ? "저장됨!" : onDone ? "저장하고 계속" : "저장"}
      </button>
    </div>
  );
}
