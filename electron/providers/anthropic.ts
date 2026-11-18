import Anthropic from "@anthropic-ai/sdk";
import {
  AIProvider,
  ChatMessage,
  ProviderSettings,
  buildAnalysisPrompt,
  buildChatSystemPrompt,
  parseAnalysisJson,
} from "./types";

export class AnthropicProvider implements AIProvider {
  readonly name = "Claude (Anthropic API)";

  constructor(private settings: ProviderSettings["anthropic"]) {}

  isConfigured(): boolean {
    return !!this.settings.apiKey;
  }

  async analyzeEmail(subject: string, sender: string, body: string) {
    const client = new Anthropic({ apiKey: this.settings.apiKey });
    const prompt = buildAnalysisPrompt(subject, sender, body);

    const response = await client.messages.create({
      model: this.settings.model,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    return parseAnalysisJson(text);
  }

  async askAboutEmail(history: ChatMessage[], subject: string, sender: string, body: string): Promise<string> {
    const client = new Anthropic({ apiKey: this.settings.apiKey });
    const response = await client.messages.create({
      model: this.settings.model,
      max_tokens: 1500,
      system: buildChatSystemPrompt(subject, sender, body),
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }
}
