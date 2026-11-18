import OpenAI from "openai";
import { ProviderId, ProviderSettings } from "./types";

/**
 * 설정 화면의 모델 셀렉트박스용 — 프로바이더별로 지금 실제 사용 가능한 모델 목록을
 * 그때그때(프로그램 실행 중) 각 서비스에 물어봐서 최신 상태로 가져옴.
 * claude-subscription만 예외: API 키 없이 인증하는 방식이라 목록 조회 API가 없어
 * 정적 목록으로 대체 (아래 CLAUDE_SUBSCRIPTION_MODELS 참고).
 */
export async function listModels(providerId: ProviderId, settings: ProviderSettings): Promise<string[]> {
  switch (providerId) {
    case "ollama":
      return listOllamaModels(settings.ollama.baseUrl);
    case "anthropic":
      return listAnthropicModels(settings.anthropic.apiKey);
    case "openai":
      return listOpenAIModels(settings.openai.apiKey);
    case "gemini":
      return listGeminiModels(settings.gemini.apiKey);
    case "claude-subscription":
      return CLAUDE_SUBSCRIPTION_MODELS;
  }
}

// claude-subscription은 OAuth(claude login) 세션으로 인증하기 때문에 목록 조회에 쓸 API 키가
// 없음 — Anthropic이 새 모델을 내면 이 배열을 수동으로 갱신해야 함 (다른 프로바이더처럼
// 자동으로 최신화되지 않는다는 점을 설정 화면에도 안내함)
// 2026-08-14 갱신: 예전 4-6 세대로 고정되어 있던 걸 최신 라인업으로 교체
const CLAUDE_SUBSCRIPTION_MODELS = [
  "claude-opus-5",
  "claude-sonnet-5",
  "claude-fable-5",
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
];

async function listOllamaModels(baseUrl: string): Promise<string[]> {
  if (!baseUrl) throw new Error("Ollama 서버 주소를 입력하세요.");
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tags`);
  if (!res.ok) {
    throw new Error(`Ollama 서버 응답 오류 (${res.status}). Ollama 앱이 실행 중인지 확인하세요.`);
  }
  const data = await res.json();
  const models = (data.models ?? []) as { name: string }[];
  return models.map((m) => m.name).sort();
}

async function listAnthropicModels(apiKey: string): Promise<string[]> {
  if (!apiKey) throw new Error("Anthropic API 키를 먼저 입력하세요.");
  // 설치된 SDK 버전(0.27)에는 models.list()가 없어 REST 엔드포인트를 직접 호출
  const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });
  if (!res.ok) {
    throw new Error(`Anthropic 모델 목록 조회 실패 (${res.status}). API 키를 확인하세요.`);
  }
  const data = await res.json();
  const models = (data.data ?? []) as { id: string }[];
  return models.map((m) => m.id);
}

async function listOpenAIModels(apiKey: string): Promise<string[]> {
  if (!apiKey) throw new Error("OpenAI API 키를 먼저 입력하세요.");
  const client = new OpenAI({ apiKey });
  const page = await client.models.list();
  return page.data
    .map((m) => m.id)
    .filter((id) => /^(gpt-|chatgpt-|o1|o3|o4)/.test(id))
    .sort();
}

async function listGeminiModels(apiKey: string): Promise<string[]> {
  if (!apiKey) throw new Error("Gemini API 키를 먼저 입력하세요.");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) {
    throw new Error(`Gemini 모델 목록 조회 실패 (${res.status}). API 키를 확인하세요.`);
  }
  const data = await res.json();
  const models = (data.models ?? []) as { name: string; supportedGenerationMethods?: string[] }[];
  return models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .sort();
}
