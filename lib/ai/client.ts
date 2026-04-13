type ChatMessage = {
  role: 'system' | 'user';
  content: Array<{
    type: 'text';
    text: string;
  }>;
};

type ChatCompletionResponse<T> = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    param?: string;
    code?: string;
  };
};

function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4.1-mini';
  const apiUrl =
    process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    throw new Error('Missing AI_API_KEY.');
  }

  return { apiKey, model, apiUrl };
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item == null) return '';
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .join('\n');
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function makeMessage(role: 'system' | 'user', text: unknown): ChatMessage {
  return {
    role,
    content: [
      {
        type: 'text',
        text: normalizeText(text)
      }
    ]
  };
}

async function requestChatCompletion<T>(
  messages: ChatMessage[],
  expectJson: boolean
): Promise<T | string> {
  const { apiKey, model, apiUrl } = getAiConfig();

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.7
  };

  if (expectJson) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();

  let data: ChatCompletionResponse<T> | null = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`AI returned non-JSON response: ${rawText || 'empty response'}`);
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `AI request failed with status ${response.status}.`
    );
  }

  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('AI response was empty.');
  }

  if (!expectJson) {
    return content;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`AI returned invalid JSON content: ${content}`);
  }
}

export async function generateJson<T>(prompt: unknown): Promise<T> {
  const result = await requestChatCompletion<T>(
    [
      makeMessage(
        'system',
        'You are a precise assistant. Return only valid JSON. Do not include markdown fences or extra commentary.'
      ),
      makeMessage('user', prompt)
    ],
    true
  );

  return result as T;
}

export async function generateText(prompt: unknown): Promise<string> {
  const result = await requestChatCompletion<string>(
    [
      makeMessage('system', 'You are a precise writing assistant.'),
      makeMessage('user', prompt)
    ],
    false
  );

  return result as string;
}