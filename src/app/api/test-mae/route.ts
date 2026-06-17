import { NextResponse } from 'next/server';

const MAE_BASE = 'https://marketdata.mae.com.ar/api/v1';
const API_KEY = process.env.MAE_API_KEY!;

export async function GET() {
  try {
    const url = `${MAE_BASE}/mercado/cotizaciones/forex?segmento=M`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        // Probamos también con header alternativo por si la API usa otro esquema
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
      rawLength: text.length,
      rawPreview: text.slice(0, 2000),
      parsed,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
