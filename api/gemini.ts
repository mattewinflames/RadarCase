export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const isQuestions = type === 'questions';
  const models = [
  'gemini-1.5-flash', 
  'gemini-1.5-pro', 
  'gemini-1.0-pro'
];
  try {
    let data: any = null;

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: isQuestions
              ? { temperature: 0.7 }
              : { responseMimeType: 'application/json', temperature: 0.1 }
          })
        }
      );
      data = await response.json();
      if (!data.error) break;
      console.log(`Model ${model} failed:`, data.error.status);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json({ result: text });
  } catch (error) {
    return res.status(500).json({ error: 'Gemini request failed' });
  }
}
