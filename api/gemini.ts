export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  // Nomi modelli aggiornati per endpoint v1 stabile
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  const isQuestions = type === 'questions';

  try {
    let finalData: any = null;
    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`Tentativo con modello: ${model}`);
        
        // Usiamo l'endpoint v1 (stabile) invece di v1beta
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
          console.error(`Errore da ${model}:`, data.error.message);
          lastError = data.error;
          continue; // Prova il prossimo modello se questo fallisce
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          console.log(`Successo con ${model}`);
          finalData = data;
          break; // Abbiamo il risultato, usciamo dal ciclo
        } else {
          lastError = { message: "Risposta vuota o bloccata dai filtri" };
        }
      } catch (err: any) {
        console.error(`Errore di rete con ${model}:`, err.message);
        lastError = err;
      }
    }

    const resultText = finalData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return res.status(500).json({ 
        error: 'Gemini non ha prodotto risultati', 
        details: lastError?.message || 'Errore sconosciuto'
      });
    }

    return res.status(200).json({ result: resultText });

  } catch (error: any) {
    console.error("Errore critico API:", error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
