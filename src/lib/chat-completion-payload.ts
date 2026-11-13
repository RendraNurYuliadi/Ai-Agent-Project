export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildChatCompletionPayload(
  model: string,
  messages: ChatCompletionMessage[],
  temperature: number,
  maxTokens: number
) {
  return {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false as const,
  };
}
