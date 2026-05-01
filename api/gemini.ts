export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  // NOMI MODELLI: Usiamo i nomi precisi supportati in v1beta (come da tua immagine)
  const models = [
    'gemini-1.5-flash-latest', 
    'gemini-1.5-pro-latest',
    'gemini-2.0-flash-exp',    // Un'ottima alternativa se disponibile
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  const isQuestions = type === 'questions';

  try {
    let finalData: any = null;
    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`Provando modello: ${model}`);
        
        // Passiamo a v1beta per massima compatibilità con i modelli preview/latest
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
              generationConfig: isQuestions
                ? { temperature: 0.7 }
                : { responseMimeType: 'application/json', temperature: 0.1 }
            })
          }
        );

        const data = await response.json();

        if (data.error) {
          console.error(`Errore con ${model}:`, data.error.message);
          lastError = data.error;
          continue; 
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          finalData = data;
          break; 
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    const resultText = finalData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return res.status(500).json({ 
        error: 'Errore generazione', 
        details: lastError?.message || 'Modelli non trovati o API instabile' 
      });
    }

    return res.status(200).json({ result: resultText });

  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Error', message: error.message });
  }
}
