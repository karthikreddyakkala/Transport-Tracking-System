import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

export const SYSTEM_PROMPT = `You are a helpful bus transit assistant for a city transport system.
You help passengers find buses, check schedules, get arrival predictions, and report issues.

You have access to real-time data including:
- Current bus locations and speeds
- Estimated arrival times (ETAs) with confidence scores
- Route schedules and stop information
- Active routes and buses

Guidelines:
- Be concise and helpful. Give direct answers.
- When providing ETAs, always mention the confidence level.
- For route questions, provide bus number, stops, and schedule.
- For issues, acknowledge and confirm you'll notify the admin team.
- Always be friendly and professional.
- If data is unavailable, say so honestly.
- Format times as "X minutes" or "H:MM AM/PM" format.

Respond in plain text. Do not use markdown formatting.`;

export async function generateChatResponse(
  userMessage: string,
  contextData: {
    buses?: Array<{
      number: string;
      routeName: string;
      speed: number;
      nextStop: string;
    }>;
    etas?: Array<{
      busNumber: string;
      stopName: string;
      minutesAway: number;
      confidence: number;
    }>;
    favoriteRoutes?: string[];
    userRole?: string;
  }
): Promise<string> {
  const contextStr = JSON.stringify(contextData, null, 2);

  const fullPrompt = `${SYSTEM_PROMPT}

REAL-TIME DATA:
${contextStr}

USER: ${userMessage}

ASSISTANT:`;

  try {
    const result = await geminiModel.generateContent(fullPrompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini error:", error);
    return "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
  }
}
