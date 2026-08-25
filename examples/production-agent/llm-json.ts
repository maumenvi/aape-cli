import type { LlmManager, LlmMessage } from '../../src/index.ts';

function extractFirstJsonObject(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('LLM did not return a JSON object');
  }
  return raw.slice(start, end + 1);
}

export async function callLlmAsJson<T extends object>(
  llm: LlmManager,
  llmId: string,
  messages: LlmMessage[],
): Promise<T> {
  const response = await llm.call(llmId, { messages, temperature: 0 });
  const jsonText = extractFirstJsonObject(response.content);
  return JSON.parse(jsonText) as T;
}
