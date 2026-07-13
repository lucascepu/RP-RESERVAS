import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const PIN = '1245';
const GH_TOKEN = process.env.GH_TOKEN!;
const REPO = 'lucascepu/RP-RESERVAS';

async function ghGet(filePath: string) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}`,
    { headers: { Authorization: `token ${GH_TOKEN}` }, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`ghGet failed: ${res.status}`);
  const d = await res.json();
  const content = Buffer.from(d.content, 'base64').toString('utf-8');
  return { data: JSON.parse(content), sha: d.sha };
}

async function ghPush(filePath: string, data: unknown, sha: string, message: string) {
  const content = Buffer.from(JSON.stringify(data)).toString('base64');
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: { Authorization: `token ${GH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha }),
    }
  );
  if (!res.ok) throw new Error(`ghPush failed: ${res.status}`);
}

async function upsert<T extends { f: string; v: number }>(
  filePath: string,
  fecha: string,
  valor: number,
  message: string,
  extra?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { data, sha } = await ghGet(filePath);
    const idx = data.findIndex((d: T) => d.f === fecha);
    if (idx >= 0) {
      data[idx].v = valor;
    } else {
      data.push({ f: fecha, v: valor, ...extra });
      data.sort((a: T, b: T) => a.f.localeCompare(b.f));
    }
    await ghPush(filePath, data, sha, message);
    return true;
  } catch (e) {
    console.error(`Error saving ${filePath}:`, e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.pin !== PIN) return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });

  const { fecha, reservas, compras, rp, mulc } = body;
  if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });

  const resultados: Record<string, boolean> = {};

  // Secuencial — un archivo a la vez para evitar conflictos de SHA
  if (reservas !== undefined && reservas !== null && reservas !== '') {
    resultados.reservas = await upsert(
      'src/data/reservas.json', fecha, Number(reservas),
      `data: reservas ${fecha} = ${reservas} MM`
    );
  }

  if (compras !== undefined && compras !== null && compras !== '') {
    resultados.compras = await upsert(
      'src/data/compras.json', fecha, Number(compras),
      `data: compras BCRA ${fecha} = ${compras} MM`
    );
  }

  if (rp !== undefined && rp !== null && rp !== '') {
    resultados.rp = await upsert(
      'src/data/riesgo-pais.json', fecha, Number(rp),
      `data: riesgo pais ${fecha} = ${rp} pbs`
    );
  }

  if (mulc !== undefined && mulc !== null && mulc !== '') {
    resultados.mulc = await upsert(
      'src/data/mulc.json', fecha, Number(mulc),
      `data: MULC ${fecha} = ${mulc} MM`,
      { tc: 0 }
    );
  }

  revalidatePath('/');
  revalidatePath('/compras');
  revalidatePath('/reservas');
  revalidatePath('/riesgo-pais');

  const ok = Object.entries(resultados).filter(([, v]) => v).map(([k]) => k);
  const errores = Object.entries(resultados).filter(([, v]) => !v).map(([k]) => k);

  return NextResponse.json({ ok, errores, resultados });
}
