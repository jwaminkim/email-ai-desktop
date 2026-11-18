import OpenAI from "openai";
import {
  AIProvider,
  ChatMessage,
  ProviderSettings,
  buildAnalysisPrompt,
  buildChatSystemPrompt,
  parseAnalysisJson,
} from "./types";

export class OpenAIProvider implements AIProvider {
  readonly name = "GPT (OpenAI API)";

  constructor(private settings: ProviderSettings["openai"]) {}

  isConfigured(): boolean {
    return !!this.settings.apiKey;
  }

  async analyzeEmail(subject: string, sender: string, body: string) {
    const client = new OpenAI({ apiKey: this.settings.apiKey });
    const prompt = buildAnalysisPrompt(subject, sender, body);

    const response = await client.chat.completions.create({
      model: this.settings.model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0].message.content ?? "";
    return parseAnalysisJson(text);
  }

  async askAboutEmail(history: ChatMessage[], subject: string, sender: string, body: string): Promise<string> {
    const client = new OpenAI({ apiKey: this.settings.apiKey });
    const response = await client.chat.completions.create({
      model: this.settings.model,
      messages: [
        { role: "system", content: buildChatSystemPrompt(subject, sender, body) },
        ...history.map((m) => ({ role: m.role, content: m.content } as const)),
      ],
    });

    return response.choices[0].message.content ?? "";
  }
}
