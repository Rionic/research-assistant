import OpenAI from 'openai';

// Groq has deprecated a model out from under this app twice already
// (llama-3.1-8b-instant, then llama-3.3-70b-versatile removed entirely).
// This wraps a chat.completions.create call so a deprecated primary model
// transparently retries on backups instead of failing the whole request.
export async function createChatCompletion(
  client: OpenAI,
  models: [string, ...string[]], // primary first, backups in order
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, 'model'>
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  let lastError: unknown;
  for (const [i, model] of models.entries()) {
    try {
      return await client.chat.completions.create({ ...params, model });
    } catch (error) {
      const isModelGone =
        error instanceof OpenAI.NotFoundError && (error as { code?: string }).code === 'model_not_found';
      if (!isModelGone || i === models.length - 1) throw error;
      // Loud on purpose: a silent fallback could quietly run on a worse
      // model indefinitely. This should get noticed and the primary updated.
      console.error(
        `[groq] model "${model}" is no longer available (deprecated?); falling back to "${models[i + 1]}"`
      );
      lastError = error;
    }
  }
  throw lastError; // unreachable given the loop above, satisfies TS
}
