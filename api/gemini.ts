export default async function handler(req: any, res: any) {
  // 1. Controllo Metodo
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type } = req.body;

  // 2. Validazione Input
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  // Configurazione modelli: flash per primo perché è fulmineo (evita timeout su Vercel)
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
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              // Aggiungiamo i safetySettings per evitare che Gemini blocchi la risposta
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
              ],
              generationConfig: isQuestions
                ? { temperature: 0.7, topP: 0.95, topK: 40 } // Più creativo per le domande
                : { responseMimeType: 'application/json', temperature: 0.1 }
            })
          }
        );

        const data = await response.json();

        // Se l'API risponde con un errore (es. Quota esaurita), logga e prova il prossimo modello
        if (data.error) {
          console.error(`Errore API da ${model}:`, data.error.message);
          lastError = data.error;
          continue;
        }

        // Se arriviamo qui, il modello ha risposto senza errori formali
        finalData = data;
        
        // Verifica se c'è effettivamente del testo nella risposta
        const hasText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (hasText) {
          console.log(`Successo con modello: ${model}`);
          break; // Esci dal ciclo for, abbiamo il risultato!
        } else {
          console.warn(`Modello ${model} ha risposto ma senza testo (possibile blocco safety)`);
          lastError = { message: "Risposta vuota o bloccata dai filtri di sicurezza" };
        }

      } catch (err) {
        console.error(`Errore di rete con ${model}:`, err);
        lastError = err;
      }
    }

    // 3. Gestione Risultato Finale
    const text = finalData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Fallimento totale. Ultimo errore:", lastError);
      return res.status(500).json({ 
        error: 'Gemini non ha prodotto risultati', 
        details: lastError?.message || 'Tutti i modelli hanno fallito'
      });
    }

    // Risposta di successo
    return res.status(200).json({ result: text });

  } catch (error: any) {
    console.error("Errore critico nello script gemini.ts:", error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
