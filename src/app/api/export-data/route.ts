import { NextResponse } from 'next/server';
import comprasRaw from '@/data/compras.json';
import mulcRaw    from '@/data/mulc.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    compras: comprasRaw,
    mulc:    mulcRaw.map((d: { f: string; v: number; tc: number }) => ({ f: d.f, v: d.v })),
  });
}
