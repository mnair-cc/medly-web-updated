import { z } from "zod";

// Message schema for chat thread data
const ChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.number(),
});

// Data field schema - looseObject allows unknown keys to pass through
export const ChatThreadDataSchema = z.looseObject({
  title: z.string().optional(),
  messages: z.array(ChatMessageSchema).optional(),
});

// GET query params
export const GetChatThreadsQuerySchema = z.object({
  collectionId: z.uuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 10;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) return 10;
      return Math.min(Math.max(parsed, 1), 100);
    }),
});

// POST request body
export const CreateChatThreadSchema = z.object({
  collectionId: z.uuid(),
  data: ChatThreadDataSchema.optional().default({}),
  documentIds: z.array(z.uuid()).nullable().optional(),
  id: z.uuid().optional(),
});

// PUT request body
export const UpdateChatThreadSchema = z.object({
  data: ChatThreadDataSchema.optional(),
  documentIds: z.array(z.uuid()).nullable().optional(),
});
