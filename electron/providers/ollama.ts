import {
  AIProvider,
  ChatMessage,
  ProviderSettings,
  buildAnalysisPrompt,
  buildChatSystemPrompt,
  parseAnalysisJson,
} from "./types";

export class OllamaProvider implements AIProvider {
  readonly name = "Ollama (로컬, 무료)";

  constructor(private settings: ProviderSettings["ollama"]) {}

  isConfigured(): boolean {
    // Ollama는 키가 필요 없음. baseUrl만 있으면 됨 (Ollama 앱이 로컬에 실행 중이어야 함)
    return !!this.settings.baseUrl;
  }

  async analyzeEmail(subject: string, sender: string, body: string) {
    const prompt = buildAnalysisPrompt(subject, sender, body);

    const res = await fetch(`${this.settings.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.settings.model,
        prompt,
        stream: false,
        format: "json",
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Ollama 호출 실패 (${res.status}). Ollama 앱이 실행 중인지, 모델(${this.settings.model})이 설치되어 있는지 확인하세요.`
      );
    }

    const data = await res.json();
    return parseAnalysisJson(data.response);
  }

  async askAboutEmail(history: ChatMessage[], subject: string, sender: string, body: string): Promise<string> {
    const res = await fetch(`${this.settings.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.settings.model,
        messages: [
          { role: "system", content: buildChatSystemPrompt(subject, sender, body) },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Ollama 호출 실패 (${res.status}). Ollama 앱이 실행 중인지, 모델(${this.settings.model})이 설치되어 있는지 확인하세요.`
      );
    }

    const data = await res.json();
    return data.message?.content ?? "";
  }
}
