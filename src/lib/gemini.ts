import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function verifyReceipt(base64Image: string, expectedAmount: number, expectedName: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this bank receipt (CBE or Telebirr). 
    Extract the following information in JSON format:
    - transactionId: string (Look for Transaction ID or Ref No)
    - amount: number
    - senderName: string (The person who sent the money)
    - date: string
    - qrData: string (If there is a QR code, try to extract its content or unique text near it)
    - isAuthentic: boolean (true if it looks like a real bank receipt, false otherwise)
    - matchesExpectedAmount: boolean (compare extracted amount with ${expectedAmount})
    - matchesExpectedName: boolean (compare extracted senderName with "${expectedName}". Allow minor spelling variations)
    
    Return ONLY the JSON object.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [imagePart, { text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return null;
  }
}
