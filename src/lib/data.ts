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

async function fetchBCRA(idVariable: number, dias = 365): Promise<DataPoint[]> {
  const desde = hace(dias);
  const hasta = toISO(new Date());
  const url = `${BCRA_BASE}/${idVariable}?desde=${desde}&hasta=${hasta}&limit=3000`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`BCRA API error ${res.status}`);
  const json = await res.json();
  const detalle: { fecha: string; valor: number }[] = json.results?.[0]?.detalle ?? [];
  return detalle
    .map(d => ({ fecha: d.fecha.slice(0, 10), valor: d.valor }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

async function fetchRiesgoPais(dias = 365): Promise<DataPoint[]> {
  const url = `${AR_DATOS_BASE}/finanzas/indices/riesgo-pais`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`ArgentinaDatos error ${res.status}`);
  const json: { fecha: string; valor: number }[] = await res.json();
  const cutoff = hace(dias);
  return json
    .filter(d => d.fecha >= cutoff)
    .map(d => ({ fecha: d.fecha.slice(0, 10), valor: d.valor }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function buildSummary(serie: DataPoint[]): IndicadorSummary {
  if (!serie.length) throw new Error('Serie vacía');
  const last = serie[serie.length - 1];
  const prev = serie.length > 1 ? serie[serie.length - 2] : last;
  const valores = serie.map(d => d.valor);
  return {
    ultimo: last.valor,
    fecha: last.fecha,
    variacion: last.valor - prev.valor,
    variacionPct: prev.valor !== 0 ? ((last.valor - prev.valor) / prev.valor) * 100 : 0,
    min12m: Math.min(...valores),
    max12m: Math.max(...valores),
    serie,
  };
}

export async function getReservas(dias = 365) {
  const serie = await fetchBCRA(1, dias);
  return buildSummary(serie);
}

export async function getRiesgoPais(dias = 365) {
  const serie = await fetchRiesgoPais(dias);
  return buildSummary(serie);
}

export async function getCompras(dias = 365) {
  const serie = await fetchBCRA(74, dias);
  return buildSummary(serie);
}
