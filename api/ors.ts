export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startLng, startLat, endLng, endLat } = req.body;

  if (!startLng || !startLat || !endLng || !endLat) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  try {
    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${process.env.ORS_API_KEY}&start=${startLng},${startLat}&end=${endLng},${endLat}`
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'ORS request failed' });
  }
}
