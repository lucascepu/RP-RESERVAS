import rpHistorico from '@/data/riesgo-pais.json';
import resHistorico from '@/data/reservas.json';

const BCRA_BASE = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias';
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

  return {
    ultimo: last.valor,
    fecha: last.fecha,
    variacion: last.valor - prev.valor,
    variacionPct: prev.valor !== 0 ? ((last.valor - prev.valor) / prev.valor) * 100 : 0,
    min12m: Math.min(...valores12m),
    max12m: Math.max(...valores12m),
    ytd: Math.round(ytd * 10) / 10,
    mtd: Math.round(mtd * 10) / 10,
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

async function fetchBCRA(idVariable: number, dias = 30): Promise<DataPoint[]> {
  const desde = hace(dias);
  const hasta = toISO(new Date());
  const url = `${BCRA_BASE}/${idVariable}?desde=${desde}&hasta=${hasta}&limit=3000`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  const detalle: { fecha: string; valor: number }[] = json.results?.[0]?.detalle ?? [];
  return detalle
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
  const serie = await mergeWithAPI(
    resHistorico as {f: string; v: number}[],
    () => fetchBCRA(1, 30)
  );
  return buildSummary(serie);
}

export async function getCompras(): Promise<ComprasSummary> {
  const serie = await fetchBCRA(74, 400);
  if (serie.length < 2) {
    return { hoy: 0, fechaHoy: toISO(new Date()), acumMes: 0, acumAnio: 0, serie: [] };
  }

  const hoy = new Date();
  const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  const inicioAnio = `${hoy.getFullYear()}-01-01`;

  const last = serie[serie.length - 1];
  const prev = serie[serie.length - 2];
  const compraDiaria = Math.round((last.valor - prev.valor) * 100) / 100;

  const puntoInicioMes = serie.find(d => d.fecha >= inicioMes);
  const acumMes = puntoInicioMes ? Math.round((last.valor - puntoInicioMes.valor) * 100) / 100 : last.valor;

  const puntoInicioAnio = serie.find(d => d.fecha >= inicioAnio);
  const acumAnio = puntoInicioAnio ? Math.round((last.valor - puntoInicioAnio.valor) * 100) / 100 : last.valor;

  const serieDaily: DataPoint[] = [];
  for (let i = 1; i < serie.length; i++) {
    serieDaily.push({
      fecha: serie[i].fecha,
      valor: Math.round((serie[i].valor - serie[i - 1].valor) * 100) / 100,
    });
  }

  return { hoy: compraDiaria, fechaHoy: last.fecha, acumMes, acumAnio, serie: serieDaily };
}
