import { AIProvider, ProviderSettings } from "./types";
import { OllamaProvider } from "./ollama";
import { AnthropicProvider } from "./anthropic";
import { ClaudeSubscriptionProvider } from "./claude-subscription";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";

/**
 * 설정(settings.activeProvider) 값에 따라 실제 사용할 프로바이더를 반환.
 * 새 프로바이더를 추가하려면:
 *   1. providers/새프로바이더.ts 에 AIProvider 구현
 *   2. 아래 switch에 case 추가
 *   3. types.ts의 ProviderId, ProviderSettings에 타입 추가
 */
export function getProvider(settings: ProviderSettings): AIProvider {
  switch (settings.activeProvider) {
    case "ollama":
      return new OllamaProvider(settings.ollama);
    case "anthropic":
      return new AnthropicProvider(settings.anthropic);
    case "claude-subscription":
      // 개인 사용 전용 (claude login 필요). 배포용 빌드에는 노출하지 마세요.
      return new ClaudeSubscriptionProvider(settings.claudeSubscription);
    case "openai":
      return new OpenAIProvider(settings.openai);
    case "gemini":
      return new GeminiProvider(settings.gemini);

    // Gemini Advanced(Google AI Pro) 구독 직접 연결은 여전히 공식 API가 없어
    // 구현하지 않음 (Gemini CLI의 OAuth는 별도 상품인 Gemini Code Assist용).

    default:
      throw new Error(`알 수 없는 프로바이더: ${settings.activeProvider}`);
  }
}

export * from "./types";
