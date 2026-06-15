import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PIN = '1245';
const DATA_PATH = path.join(process.cwd(), 'src/data/compras.json');

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.pin !== PIN) {
    return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 });
  }

  const { fecha, valor } = body;
  if (!fecha || valor === undefined) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  }

  let data: { f: string; v: number }[] = [];
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    data = JSON.parse(raw);
  } catch {
    data = [];
  }

  // Reemplazar si ya existe la fecha, sino agregar
  const idx = data.findIndex(d => d.f === fecha);
  if (idx >= 0) {
    data[idx].v = valor;
  } else {
    data.push({ f: fecha, v: valor });
    data.sort((a, b) => a.f.localeCompare(b.f));
  }

  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 0));
  return NextResponse.json({ ok: true, ultimo: data[data.length - 1] });
}

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const data: { f: string; v: number }[] = JSON.parse(raw);
    return NextResponse.json({ ultimo: data[data.length - 1], total: data.length });
  } catch {
    return NextResponse.json({ ultimo: null, total: 0 });
  }
}
