const defaultCommute = {
  daughter: { distance: "5.0 km" },
  work: { distance: "10.0 km" }
};

export async function estimateCommute(
  houseAddress: string,
  destinations: { daughter: { address: string }, work: { address: string } }
) {
  try {
    const prompt = `Estima la distanza in km tra ${houseAddress} e queste due mete a Bologna:
    1. Figlia: ${destinations.daughter.address || 'Bologna Centro'}
    2. Lavoro: ${destinations.work.address || 'Bologna Periferia'}
    Rispondi solo con JSON: {"daughter": {"distance": "X km"}, "work": {"distance": "Y km"}}`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 4000)
    );

    const apiCall = async () => {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      return JSON.parse(data.result.trim());
    };

    const result = await Promise.race([apiCall(), timeoutPromise]);
    return result as any;
  } catch (error) {
    console.warn('AI Timeout or Error, using defaults', error);
    return defaultCommute;
  }
}
