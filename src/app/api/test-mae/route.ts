import { NextResponse } from 'next/server';

const API_KEY = process.env.MAE_API_KEY!;

async function probar(url: string, headers: Record<string,string>) {
  try {
    const res = await fetch(url, { headers, cache: 'no-store' });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    const esHtml = text.trim().startsWith('<!doctype') || text.trim().startsWith('<html');
    return {
      url,
      headerUsado: Object.keys(headers)[0] || 'ninguno',
      status: res.status,
      ok: res.ok,
      esHtml,
      preview: text.slice(0, 300),
      parsed: esHtml ? null : parsed,
    };
  } catch (e) {
    return { url, error: String(e) };
  }
}

export async function GET() {
  const intentos = [
    probar('https://servicios.mae.com.ar/api/v1/mercado/cotizaciones/forex?segmento=M', { 'Authorization': `Bearer ${API_KEY}` }),
    probar('https://servicios.mae.com.ar/marketdata/api/v1/mercado/cotizaciones/forex?segmento=M', { 'Authorization': `Bearer ${API_KEY}` }),
    probar('https://marketdata.mae.com.ar/api/v1/mercado/cotizaciones/forex?segmento=M', { 'X-Api-Key': API_KEY }),
    probar('https://marketdata.mae.com.ar/api/v1/mercado/cotizaciones/forex?segmento=M', { 'apikey': API_KEY }),
  ];

  const resultados = await Promise.all(intentos);
  return NextResponse.json({ resultados });
}
