import {
  AIProvider,
  ChatMessage,
  ProviderSettings,
  buildAnalysisPrompt,
  buildChatSystemPrompt,
  parseAnalysisJson,
} from "./types";

// tsc가 CommonJS로 컴파일할 때 `await import(...)`를 내부적으로 `require(...)`로
// 다시 downlevel해버려서(ERR_REQUIRE_ESM 재발), ESM 전용 패키지를 불러올 때는
// new Function으로 감싸 진짜 런타임 동적 import()를 강제로 남겨야 함.
function importEsm<T>(specifier: string): Promise<T> {
  return new Function("m", "return import(m)")(specifier) as Promise<T>;
}

/**
 * Claude Pro/Max 구독으로 직접 연결하는 프로바이더.
 *
 * 사전 준비 (사용자가 한 번만 하면 됨):
 *   1. npm install -g @anthropic-ai/claude-code
 *   2. claude login   ← 브라우저가 열리고 Claude Pro/Max 계정으로 로그인
 *   그러면 로그인 세션이 로컬에 저장되고, 이 프로바이더가 자동으로 그걸 사용합니다.
 *   API 키(ANTHROPIC_API_KEY)는 필요 없습니다 (설정되어 있으면 오히려 그게 우선
 *   적용되어 구독이 아닌 API 과금으로 빠질 수 있으니, 이 옵션을 쓸 때는
 *   ANTHROPIC_API_KEY 환경변수를 비워두세요).
 *
 * ⚠️ 개인 사용 전용: Anthropic 정책상 "개인이 자신의 컴퓨터에서 자신의
 * 구독으로 직접 쓰는" 용도로만 지원됩니다. 여러 사람에게 이 앱을 배포할 때는
 * 이 프로바이더를 사용하지 마세요.
 */
export class ClaudeSubscriptionProvider implements AIProvider {
  readonly name = "Claude Pro/Max (구독, 개인용)";

  constructor(private settings: ProviderSettings["claudeSubscription"]) {}

  isConfigured(): boolean {
    // 키가 필요 없음 - claude login 여부는 실제 호출 시점에 판가름남
    return true;
  }

  async analyzeEmail(subject: string, sender: string, body: string) {
    // @anthropic-ai/claude-agent-sdk는 ESM 전용 패키지라 CommonJS(electron)에서는
    // 진짜 동적 import()로만 불러올 수 있음 (정적 import는 물론, tsc가 그냥 downlevel한
    // import()도 require()로 바뀌어버려 ERR_REQUIRE_ESM이 남음 → importEsm 헬퍼 사용)
    const { query } = await importEsm<typeof import("@anthropic-ai/claude-agent-sdk")>(
      "@anthropic-ai/claude-agent-sdk"
    );
    const prompt = buildAnalysisPrompt(subject, sender, body);
    let resultText = "";

    try {
      for await (const message of query({
        prompt,
        options: {
          model: this.settings.model,
          allowedTools: [], // 파일/터미널 접근 불필요 - 순수 텍스트 분석만
          maxTurns: 1,
        },
      })) {
        if (message.type === "result" && message.subtype === "success") {
          resultText = message.result;
        }
      }
    } catch (e) {
      throw new Error(
        "Claude Pro/Max 구독 호출 실패. 'claude login'으로 로그인했는지 확인하세요. (" +
          (e as Error).message +
          ")"
      );
    }

    if (!resultText) {
      throw new Error("Claude 구독에서 응답을 받지 못했습니다.");
    }

    return parseAnalysisJson(resultText);
  }

  async askAboutEmail(history: ChatMessage[], subject: string, sender: string, body: string): Promise<string> {
    // 이 SDK의 query()는 단일 prompt만 받아서, 대화 이력을 텍스트로 풀어서 매번 다시 보냄
    const { query } = await importEsm<typeof import("@anthropic-ai/claude-agent-sdk")>(
      "@anthropic-ai/claude-agent-sdk"
    );
    const conversation = history.map((m) => `${m.role === "user" ? "사용자" : "AI"}: ${m.content}`).join("\n\n");
    const prompt = `${buildChatSystemPrompt(subject, sender, body)}\n\n대화 기록:\n${conversation}\n\n위 대화에 이어 마지막 사용자 질문에 답변하세요.`;
    let resultText = "";

    try {
      for await (const message of query({
        prompt,
        options: { model: this.settings.model, allowedTools: [], maxTurns: 1 },
      })) {
        if (message.type === "result" && message.subtype === "success") {
          resultText = message.result;
        }
      }
    } catch (e) {
      throw new Error(
        "Claude Pro/Max 구독 호출 실패. 'claude login'으로 로그인했는지 확인하세요. (" + (e as Error).message + ")"
      );
    }

    if (!resultText) {
      throw new Error("Claude 구독에서 응답을 받지 못했습니다.");
    }

    return resultText;
  }
}
