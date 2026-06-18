import { NextResponse } from 'next/server';

const API_KEY = process.env.MAE_API_KEY!;

export async function GET() {
  try {
    const url = 'https://api.mae.com.ar/MarketData/v1/mercado/cotizaciones/forex';
    const res = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const status = res.status;
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}

    return NextResponse.json({
      status,
      ok: res.ok,
      preview: text.slice(0, 1500),
      parsed,
      cantidadRegistros: Array.isArray(parsed) ? parsed.length : null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
