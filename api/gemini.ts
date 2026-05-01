export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const isQuestions = type === 'questions';

  // ✅ SOLO MODELLI ATTUALMENTE SUPPORTATI
  const models = [
    'gemini-2.5-flash', // veloce + economico (best default)
    'gemini-2.0-flash', // fallback stabile
    'gemini-2.5-pro'    // più potente (fallback finale)
  ];

  let finalText: string | null = null;
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`➡️ Provo modello: ${model}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
              temperature: isQuestions ? 0.7 : 0.1,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      const data = await response.json().catch(() => null);

      // ❌ errore HTTP
      if (!response.ok) {
        console.error(`❌ ${model} HTTP ${response.status}:`, data);
        lastError = data?.error || { message: `HTTP ${response.status}` };
        continue;
      }

      // ❌ errore API
      if (data?.error) {
        console.error(`❌ ${model} API error:`, data.error.message);
        lastError = data.error;
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!text) {
        console.warn(`⚠️ ${model} risposta vuota`);
        continue;
      }

      console.log(`✅ Successo con ${model}`);
      finalText = text;
      break;

    } catch (err: any) {
      console.error(`🔥 Errore fetch con ${model}:`, err.message);
      lastError = err;
    }
  }

  // ❌ nessun modello ha funzionato
  if (!finalText) {
    return res.status(500).json({
      error: 'Errore generazione',
      details: lastError?.message || 'Tutti i modelli hanno fallito'
    });
  }

  // 🧼 Pulizia output (evita ```json ecc)
  const clean = finalText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return res.status(200).json({ result: clean });
}
