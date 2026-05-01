export default async function handler(req: any, res: any) {
  // 1. Sicurezza e validazione
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  // 2. Selezione dei modelli basata sul tuo pannello (image_4acf03.png)
  // Usiamo nomi che Google garantisce essere disponibili nell'endpoint v1
  const models = [
    'gemini-1.5-flash-latest', // Corrisponde a "Gemini Flash Latest"
    'gemini-1.5-pro-latest',  // Corrisponde a "Gemini Pro Latest"
    'gemini-1.5-flash',        // Fallback standard
    'gemini-1.5-pro'           // Fallback pro
  ];

  const isQuestions = type === 'questions';

  try {
    let finalData: any = null;
    let lastError: any = null;

    // 3. Ciclo di tentativi (Fallback)
    for (const model of models) {
      try {
        console.log(`Tentativo in corso con: ${model}`);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              // Impostazioni per evitare blocchi inutili su dati immobiliari
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
              ],
              generationConfig: isQuestions
                ? { temperature: 0.7 } // Più creatività per le domande
                : { responseMimeType: 'application/json', temperature: 0.1 } // Rigido per dati strutturati
            })
          }
        );

        const data = await response.json();

        // Se il modello specifico non è trovato o la quota è finita, passa al prossimo
        if (data.error) {
          console.warn(`Modello ${model} non disponibile:`, data.error.message);
          lastError = data.error;
          continue; 
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          console.log(`✅ Successo ottenuto con: ${model}`);
          finalData = data;
          break; // Esci dal ciclo: abbiamo la risposta
        } else {
          lastError = { message: "Risposta vuota (possibile blocco filtri safety)" };
        }
      } catch (err: any) {
        console.error(`Errore di connessione con ${model}:`, err.message);
        lastError = err;
      }
    }

    // 4. Invio risposta al frontend
    const resultText = finalData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return res.status(500).json({ 
        error: 'L\'IA non ha prodotto risultati utilizzabili', 
        details: lastError?.message || 'Tutti i modelli in lista hanno fallito.'
      });
    }

    return res.status(200).json({ result: resultText });

  } catch (error: any) {
    console.error("Errore critico globale:", error);
    return res.status(500).json({ error: 'Errore interno del server', message: error.message });
  }
}
