import { createVertex } from "@ai-sdk/google-vertex";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
import { createAnthropic } from "@ai-sdk/anthropic";

// Parse service account credentials from env (same pattern as Firebase admin)
const serviceAccountKey = process.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_KEY;
const credentials = serviceAccountKey ? JSON.parse(serviceAccountKey) : undefined;

const googleAuthOptions = credentials
  ? {
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    }
  : undefined;

// Create Google Vertex client
export const vertex = createVertex({
  project: credentials?.project_id || process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || "global",
  googleAuthOptions,
});

// Create Vertex Anthropic client with same credentials
const vertexAnthropic = createVertexAnthropic({
  project: credentials?.project_id || process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || "global",
  googleAuthOptions,
});

// Anthropic direct API client
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Azure Foundry Anthropic client (uses Anthropic API format)
const azureAnthropic = createAnthropic({
  baseURL: process.env.AZURE_ANTHROPIC_ENDPOINT,
  apiKey: process.env.AZURE_API_KEY,
});

// Default model for most operations
// export const defaultModel = vertex("gemini-3-flash-preview");
// export const defaultModel = anthropic("claude-sonnet-4-5-20250929");
// export const defaultModel = vertexAnthropic("claude-sonnet-4-5@20250929");
export const defaultModel = azureAnthropic("claude-sonnet-4-5");

// Faster model for simple tasks (title suggestion, etc.)
export const fastModel = vertex("gemini-3-flash-preview");
// export const fastModel = vertexAnthropic("gemini-claude-haiku-4-5@20251001");

// export const haikuModel = azureAnthropic("claude-sonnet-4-5");
export const haikuModel = vertexAnthropic("claude-haiku-4-5@20251001");