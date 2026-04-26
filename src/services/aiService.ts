/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_SETTINGS } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function estimateCommute(houseAddress: string, destinations: { daughter: { address: string }, work: { address: string } }) {
  const defaultCommute = {
    daughter: { distance: "5.0 km" },
    work: { distance: "10.0 km" }
  };

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 4000)
    );

    const aiCall = async () => {
      const prompt = `Estima la distanza in km tra ${houseAddress} e queste due mete a Bologna:
      1. Figlia: ${destinations.daughter.address || 'Bologna Centro'}
      2. Lavoro: ${destinations.work.address || 'Bologna Periferia'}
      Rispondi solo con JSON: {"daughter": {"distance": "X km"}, "work": {"distance": "Y km"}}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              daughter: {
                type: Type.OBJECT,
                properties: {
                  distance: { type: Type.STRING }
                },
                required: ["distance"]
              },
              work: {
                type: Type.OBJECT,
                properties: {
                  distance: { type: Type.STRING }
                },
                required: ["distance"]
              }
            },
            required: ["daughter", "work"]
          }
        }
      });
      return JSON.parse(response.text.trim());
    };

    const result = await Promise.race([aiCall(), timeoutPromise]);
    return result as any;
  } catch (error) {
    console.warn("AI Timeout or Error, using defaults", error);
    return defaultCommute;
  }
}
