import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "OpenAI API key not configured" });
  }

  const openai = new OpenAI({ apiKey });

  const { prompt, context } = req.body as { prompt?: string; context?: string };
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  const userContent = context
    ? `[Context: ${context}]\n\n${prompt}`
    : prompt;

  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const isGpt52 = model.includes("gpt-5.2");

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: userContent }],
      max_completion_tokens: 256,
      ...(!isGpt52 && { temperature: 0.7 }),
    });

    const content = completion.choices[0]?.message?.content ?? "No response.";
    return res.status(200).json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
