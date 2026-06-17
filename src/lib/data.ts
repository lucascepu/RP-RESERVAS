import rpHistorico from '@/data/riesgo-pais.json';
import resHistorico from '@/data/reservas.json';
import comprasHistorico from '@/data/compras.json';

const AR_DATOS_BASE = 'https://api.argentinadatos.com/v1';

export interface DataPoint {
  fecha: string;
  valor: number;
}

export interface IndicadorSummary {
  ultimo: number;
  fecha: string;
  variacion: number;
  variacionPct: number;
  min12m: number;
  max12m: number;
  ytd: number;
  mtd: number;
  badge?: string;
  serie: DataPoint[];
}

export interface ComprasSummary {
  hoy: number;
  fechaHoy: string;
  acumMes: number;
  acumAnio: number;
  serie: DataPoint[];
}

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hace(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return toISO(d);
}

function buildSummary(serie: DataPoint[]): IndicadorSummary {
  if (!serie.length) throw new Error('Serie vacía');
  const last = serie[serie.length - 1];
  const prev = serie.length > 1 ? serie[serie.length - 2] : last;
  const desde12m = hace(365);
  const serie12m = serie.filter(d => d.fecha >= desde12m);
  const valores12m = serie12m.length ? serie12m.map(d => d.valor) : serie.map(d => d.valor);

  const hoy = new Date();
  const inicioAnio = `${hoy.getFullYear()}-01-01`;
  const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;

  const puntoInicioAnio = [...serie].reverse().find(d => d.fecha < inicioAnio);
  const puntoInicioMes = [...serie].reverse().find(d => d.fecha < inicioMes);

  const ytd = puntoInicioAnio ? last.valor - puntoInicioAnio.valor : 0;
  const mtd = puntoInicioMes ? last.valor - puntoInicioMes.valor : 0;

  // Badge: mínimo de N años
  const añosMinimo = [1, 2, 3, 5, 8, 10];
  let badge: string | undefined;
  for (const años of añosMinimo) {
    const desde = new Date();
    desde.setFullYear(desde.getFullYear() - años);
    const desdeISO = desde.toISOString().slice(0, 10);
    const serieN = serie.filter(d => d.fecha >= desdeISO);
    if (serieN.length && last.valor <= Math.min(...serieN.map(d => d.valor))) {
      badge = `Mínimo ${años} año${años > 1 ? 's' : ''}`;
    }
  }

  return {
    ultimo: last.valor,
    fecha: last.fecha,
    variacion: last.valor - prev.valor,
    variacionPct: prev.valor !== 0 ? ((last.valor - prev.valor) / prev.valor) * 100 : 0,
    min12m: Math.min(...valores12m),
    max12m: Math.max(...valores12m),
    ytd: Math.round(ytd * 10) / 10,
    mtd: Math.round(mtd * 10) / 10,
    badge,
    serie,
  };
}

async function mergeWithAPI<T extends {f: string; v: number}>(
  historico: T[],
  fetchFresh: () => Promise<DataPoint[]>
): Promise<DataPoint[]> {
  const localSerie: DataPoint[] = historico
    .map(d => ({ fecha: d.f, valor: d.v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  try {
    const fresh = await fetchFresh();
    const lastLocal = localSerie[localSerie.length - 1]?.fecha ?? '';
    const newPoints = fresh.filter(d => d.fecha > lastLocal);
    return [...localSerie, ...newPoints];
  } catch {
    return localSerie;
  }
}

async function fetchRPfresh(): Promise<DataPoint[]> {
  const url = `${AR_DATOS_BASE}/finanzas/indices/riesgo-pais`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json: { fecha: string; valor: number }[] = await res.json();
  return json
    .map(d => ({ fecha: d.fecha.slice(0, 10), valor: d.valor }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function getRiesgoPais() {
  const serie = await mergeWithAPI(
    rpHistorico as {f: string; v: number}[],
    fetchRPfresh
  );
  return buildSummary(serie);
}

export async function getReservas() {
  // Reservas: histórico local + carga manual diaria (BCRA no publica API confiable del dato del día)
  const serie: DataPoint[] = (resHistorico as {f: string; v: number}[])
    .map(d => ({ fecha: d.f, valor: d.v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return buildSummary(serie);
}

export async function getCompras(): Promise<ComprasSummary> {
  // Compras/ventas de divisas: 100% carga manual (BCRA Twitter/X @BancoCentral_AR, 17hs)
  const serie: DataPoint[] = (comprasHistorico as {f: string; v: number}[])
    .map(d => ({ fecha: d.f, valor: d.v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (serie.length < 1) {
    return { hoy: 0, fechaHoy: toISO(new Date()), acumMes: 0, acumAnio: 0, serie: [] };
  }

  const hoy = new Date();
  const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  const inicioAnio = `${hoy.getFullYear()}-01-01`;

  const last = serie[serie.length - 1];
  const compraDiaria = last.valor;

  const serieMes = serie.filter(d => d.fecha >= inicioMes);
  const acumMes = serieMes.reduce((sum, d) => sum + d.valor, 0);

  const serieAnio = serie.filter(d => d.fecha >= inicioAnio);
  const acumAnio = serieAnio.reduce((sum, d) => sum + d.valor, 0);

  return {
    hoy: compraDiaria,
    fechaHoy: last.fecha,
    acumMes: Math.round(acumMes * 10) / 10,
    acumAnio: Math.round(acumAnio * 10) / 10,
    serie,
  };
}
