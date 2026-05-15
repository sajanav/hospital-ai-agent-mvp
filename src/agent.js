import { summarySchema } from "./schema.js";
import { buildMockSummary, buildSystemPrompt, buildUserPrompt } from "./templates.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export async function draftSummary(summaryType, request) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      draft: buildMockSummary(summaryType, request),
      model: "mock",
      provider: "local"
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.2";
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: buildSystemPrompt(summaryType)
        },
        {
          role: "user",
          content: buildUserPrompt(summaryType, request)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "clinical_documentation_summary",
          strict: true,
          schema: summarySchema
        }
      }
    })
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI request failed with HTTP ${response.status}`);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  return {
    draft: JSON.parse(outputText),
    model,
    provider: "openai",
    responseId: payload.id
  };
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

async function readJsonResponse(response) {
  const body = await response.text();

  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const preview = body.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(
      `OpenAI request returned ${response.status} ${response.statusText || ""} instead of JSON. ` +
        `Preview: ${preview}`
    );
  }
}
