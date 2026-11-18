import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIProvider,
  ChatMessage,
  ProviderSettings,
  buildAnalysisPrompt,
  buildChatSystemPrompt,
  parseAnalysisJson,
} from "./types";

export class GeminiProvider implements AIProvider {
  readonly name = "Gemini (Google API)";

  constructor(private settings: ProviderSettings["gemini"]) {}

  isConfigured(): boolean {
    return !!this.settings.apiKey;
  }

  async analyzeEmail(subject: string, sender: string, body: string) {
    const genAI = new GoogleGenerativeAI(this.settings.apiKey);
    const model = genAI.getGenerativeModel({ model: this.settings.model });
    const prompt = buildAnalysisPrompt(subject, sender, body);

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseAnalysisJson(text);
  }

  async askAboutEmail(history: ChatMessage[], subject: string, sender: string, body: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.settings.apiKey);
    const model = genAI.getGenerativeModel({ model: this.settings.model });

    // 이 SDK 버전엔 별도 system role이 없어, 컨텍스트를 첫 turn으로 흉내내서 주입
    const contents = [
      { role: "user", parts: [{ text: buildChatSystemPrompt(subject, sender, body) + "\n\n이제 대화를 시작합니다." }] },
      { role: "model", parts: [{ text: "네, 메일 내용을 확인했습니다. 무엇이 궁금하신가요?" }] },
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const result = await model.generateContent({ contents });
    return result.response.text();
  }
}
