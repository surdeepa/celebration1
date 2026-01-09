
import { GoogleGenAI } from "@google/genai";
import { Customer } from "../types";

export const generateWish = async (customer: Customer): Promise<string> => {
  // Always use a named parameter and process.env.API_KEY directly as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Write a short, professional, yet warm ${customer.eventType.toLowerCase()} wish for a customer named ${customer.name}. 
    The company name is VPP Jewellers. Keep it under 30 words. Mention that we value their relationship and hope their day is as sparkling as our jewelry.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use .text property directly, do not call it as a function.
    return response.text || "Happy Celebration from VPP Jewellers! Wishing you a wonderful day filled with joy and sparkle.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Happy ${customer.eventType.toLowerCase()} to our valued customer, ${customer.name}! Best wishes from team VPP Jewellers.`;
  }
};
