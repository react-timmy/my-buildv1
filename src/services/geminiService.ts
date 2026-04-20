import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const PROMPT = `
You are an expert media cataloger. Your task is to parse media filenames and extract structured metadata.
Return a JSON array of objects.

For each filename provided:
1. "original_name": the input string.
2. "type": "movie", "series", or "unknown".
3. "clean_title": the proper title of the show or movie.
4. "year": the release year if present (number).
5. "season": the season number if it's a series (number).
6. "episode": the episode number if it's a series (number).
7. "folderName": a consistent name to group episodes of the same series.

Example input: "Absolute.Duo.E08.2015.1080p.mp4"
Example output: { "original_name": "Absolute.Duo.E08.2015.1080p.mp4", "type": "series", "clean_title": "Absolute Duo", "year": 2015, "season": 1, "episode": 8, "folderName": "Absolute Duo" }

Filenames to parse:
{{FILENAMES}}
`;

export async function parseFilenames(filenames: string[]) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY missing, skipping AI identification.");
    return filenames.map(f => ({ original_name: f, type: 'unknown', clean_title: f }));
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: PROMPT.replace("{{FILENAMES}}", filenames.join("\n")),
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Parse Error:", error);
    return filenames.map(f => ({ original_name: f, type: 'unknown', clean_title: f }));
  }
}

// Simple rate limiter state
let lastCall = 0;
const CALL_DELAY = 1000; // 1 second between chunks to be safe

export async function identifyMediaBatch(filenames: string[]) {
  // Process in chunks of 20 to avoid context issues and rate limits
  const chunks = [];
  for (let i = 0; i < filenames.length; i += 20) {
    chunks.push(filenames.slice(i, i + 20));
  }

  const allResults = [];
  for (const chunk of chunks) {
    const now = Date.now();
    if (now - lastCall < CALL_DELAY) {
      await new Promise(r => setTimeout(r, CALL_DELAY - (now - lastCall)));
    }
    const result = await parseFilenames(chunk);
    allResults.push(...result);
    lastCall = Date.now();
  }
  return allResults;
}

// Stats for the user to see "AI working"
export function getRateStatus() {
  return { 
    limit: 15, // Approx for free tier per min
    used: Math.floor((Date.now() - 60000) < lastCall ? 1 : 0) 
  };
}
