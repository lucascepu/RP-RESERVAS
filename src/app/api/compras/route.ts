import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const PIN = '1245';
const GH_TOKEN = process.env.GH_TOKEN!;
const REPO = 'lucascepu/RP-RESERVAS';
const FILE_PATH = 'src/data/compras.json';

async function ghGet() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    { headers: { Authorization: `token ${GH_TOKEN}` }, cache: 'no-store' }
  );
  const d = await res.json();
  const content = Buffer.from(d.content, 'base64').toString('utf-8');
  return { data: JSON.parse(content), sha: d.sha };
}

async function ghPush(data: {f:string;v:number}[], sha: string, message: string) {
  const content = Buffer.from(JSON.stringify(data, null, 0)).toString('base64');
  await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: { Authorization: `token ${GH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha }),
    }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.pin !== PIN) return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });

  const { fecha, valor } = body;
  if (!fecha || valor === undefined) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

  const { data, sha } = await ghGet();

  const idx = data.findIndex((d: {f:string}) => d.f === fecha);
  if (idx >= 0) {
    data[idx].v = valor;
  } else {
    data.push({ f: fecha, v: valor });
    data.sort((a: {f:string}, b: {f:string}) => a.f.localeCompare(b.f));
  }

  await ghPush(data, sha, `data: compras BCRA ${fecha} = ${valor} MM`);
  revalidatePath('/');
  revalidatePath('/compras');
  revalidatePath('/reservas');
  revalidatePath('/riesgo-pais');
  return NextResponse.json({ ok: true, ultimo: data[data.length - 1] });
}

export async function GET() {
  try {
    const { data } = await ghGet();
    return NextResponse.json({ ultimo: data[data.length - 1] ?? null, total: data.length });
  } catch {
    return NextResponse.json({ ultimo: null, total: 0 });
  }
}
