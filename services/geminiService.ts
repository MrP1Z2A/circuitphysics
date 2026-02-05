
import { GoogleGenAI, Type } from "@google/genai";
import { CircuitComponent, Wire } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function analyzeCircuit(components: CircuitComponent[], wires: Wire[]): Promise<string> {
  const circuitSummary = {
    componentCounts: components.reduce((acc: any, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {}),
    switches: components.filter(c => c.type === 'SWITCH').map(s => s.state ? 'Closed' : 'Open'),
    wireCount: wires.length
  };

  const prompt = `
    Analyze this simple DC circuit configuration and explain its behavior like a professional electrical engineer.
    Components: ${JSON.stringify(circuitSummary)}
    
    Give a short, engaging, and educational summary of whether the circuit should work, what might be wrong, or interesting facts about these components.
    Keep it under 150 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "I'm having trouble analyzing the circuit right now.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "The AI analyst is currently offline, but your simulation is still active!";
  }
}
