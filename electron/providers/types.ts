/**
 * 모든 AI 프로바이더가 구현해야 하는 공통 인터페이스.
 * 여기 정의된 형태만 맞추면 어떤 모델이든 설정 화면에서 바로 교체 가능합니다.
 */
export interface EmailAnalysis {
  category: string;
  urgency: "높음" | "중간" | "낮음";
  summary: string;
  keyPoints: string[];
  suggestedReply: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIProvider {
  /** 설정 화면에 표시될 이름 */
  readonly name: string;
  /** 이 프로바이더가 지금 바로 사용 가능한 상태인지 (키 입력 여부 등) */
  isConfigured(): boolean;
  /** 이메일 제목/보낸사람/본문을 받아 분석 결과를 반환 */
  analyzeEmail(subject: string, sender: string, body: string): Promise<EmailAnalysis>;
  /** 메일 내용을 근거로 대화형으로 질문에 답변 (history의 마지막 항목이 이번 질문) */
  askAboutEmail(history: ChatMessage[], subject: string, sender: string, body: string): Promise<string>;
}

export type ProviderId = "ollama" | "anthropic" | "claude-subscription" | "openai" | "gemini";

export interface ProviderSettings {
  activeProvider: ProviderId;
  ollama: { baseUrl: string; model: string };
  anthropic: { apiKey: string; model: string };
  claudeSubscription: { model: string };
  openai: { apiKey: string; model: string };
  gemini: { apiKey: string; model: string };
}

export const DEFAULT_SETTINGS: ProviderSettings = {
  activeProvider: "ollama",
  ollama: { baseUrl: "http://localhost:11434", model: "llama3.1" },
  anthropic: { apiKey: "", model: "claude-sonnet-5" },
  claudeSubscription: { model: "claude-sonnet-5" },
  openai: { apiKey: "", model: "gpt-4o" },
  gemini: { apiKey: "", model: "gemini-1.5-pro" },
};

/**
 * ⚠️ "claude-subscription"은 Claude Pro/Max 구독을 Claude Agent SDK(OAuth)로
 * 사용하는 옵션입니다. Anthropic 정책상 "개인이 자기 컴퓨터에서 개인적으로 쓰는"
 * 용도로만 지원됩니다. 여러 동료에게 이 앱을 배포할 때는 이 옵션을 끄고
 * anthropic(API 키) 또는 ollama를 쓰세요 — 본인만 쓰는 환경에서만 사용하세요.
 *
 * Gemini Advanced(Google AI Pro) 구독은 여전히 프로그램 연결을 지원하지
 * 않아 넣지 않았습니다.
 */

/** 공통 분석 프롬프트. 회사 정책/FAQ를 반영하려면 여기를 수정하세요. */
export function buildAnalysisPrompt(subject: string, sender: string, body: string): string {
  return `다음은 수신한 이메일입니다.

제목: ${subject}
보낸사람: ${sender}
본문:
${body.slice(0, 4000)}

아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "category": "문의/요청/불만/영업/스팸/기타 중 하나",
  "urgency": "높음/중간/낮음",
  "summary": "핵심 내용 한두 문장 요약",
  "keyPoints": ["요청사항이나 확인이 필요한 핵심 포인트들"],
  "suggestedReply": "실제 답장으로 바로 쓸 수 있는 정중한 한국어 답변 초안 (인사말과 마무리 포함)"
}`;
}

/** 대화형 질문 답변용 공통 컨텍스트(시스템) 프롬프트 */
export function buildChatSystemPrompt(subject: string, sender: string, body: string): string {
  return `다음은 사용자가 받은 이메일입니다. 이 메일 내용을 근거로 사용자의 질문에 정확하고 간결하게 한국어로 답변하세요.
메일 본문에 없는 내용은 추측해서 답하지 말고, 모른다고 솔직히 답하세요.

제목: ${subject}
보낸사람: ${sender}
본문:
${body.slice(0, 6000)}`;
}

export function parseAnalysisJson(text: string): EmailAnalysis {
  const cleaned = text.trim().replace(/^```json|```$/gm, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    category: parsed.category,
    urgency: parsed.urgency,
    summary: parsed.summary,
    keyPoints: parsed.keyPoints ?? [],
    suggestedReply: parsed.suggestedReply,
  };
}
