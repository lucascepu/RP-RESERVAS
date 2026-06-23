import rpHistorico from '@/data/riesgo-pais.json';
import resHistorico from '@/data/reservas.json';
import comprasHistorico from '@/data/compras.json';
import comprasAjuste from '@/data/compras-ajuste.json';
import mulcHistorico from '@/data/mulc.json';

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
  pctMulcHoy: number;
  volMulcHoy: number;
  acum5ruedas: number;
  prom5ruedas: number;
  pctPromedio5ruedas: number;
  serieCompras: DataPoint[];
  seriePct: DataPoint[];
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
  const serie: DataPoint[] = (resHistorico as {f: string; v: number}[])
    .map(d => ({ fecha: d.f, valor: d.v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return buildSummary(serie);
}

export async function getCompras(): Promise<ComprasSummary> {
  const serie: DataPoint[] = (comprasHistorico as {f: string; v: number}[])
    .map(d => ({ fecha: d.f, valor: d.v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const mulcSerie = (mulcHistorico as {f: string; v: number; tc: number}[])
    .sort((a, b) => a.f.localeCompare(b.f));

  if (serie.length < 1) {
    return {
      hoy: 0, fechaHoy: toISO(new Date()),
      acumMes: 0, acumAnio: 0,
      pctMulcHoy: 0, volMulcHoy: 0,
      acum5ruedas: 0, pctPromedio5ruedas: 0,
      serieCompras: [], seriePct: [],
    };
  }

  const hoy = new Date();
  const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;

  const last = serie[serie.length - 1];
  const compraDiaria = last.valor;

  // Acumulado mes (datos reales diarios)
  const serieMes = serie.filter(d => d.fecha >= inicioMes);
  const acumMes = serieMes.reduce((sum, d) => sum + d.valor, 0);

  // Acumulado año = ajuste pre-carga + suma real
  const ajusteFecha = comprasAjuste.acumuladoAlCierre.fecha;
  const ajusteValor = comprasAjuste.acumuladoAlCierre.valor;
  const seriePostAjuste = serie.filter(d => d.fecha > ajusteFecha);
  const acumAnio = ajusteValor + seriePostAjuste.reduce((sum, d) => sum + d.valor, 0);

  // % BCRA/MULC del día
  const mulcDict = Object.fromEntries(mulcSerie.map(d => [d.f, d.v]));
  const volMulcHoy = mulcDict[last.fecha] ?? 0;
  const pctMulcHoy = volMulcHoy > 0 ? Math.round(compraDiaria / volMulcHoy * 1000) / 10 : 0;

  // Últimas 5 ruedas
  const ultimas5 = serie.slice(-5);
  const acum5ruedas = ultimas5.reduce((sum, d) => sum + d.valor, 0);
  const pctPromedio5ruedas = ultimas5.reduce((sum, d) => {
    const mulcVol = mulcDict[d.fecha] ?? 0;
    return sum + (mulcVol > 0 ? d.valor / mulcVol * 100 : 0);
  }, 0) / ultimas5.length;

  // Serie % diario para el gráfico
  const seriePct: DataPoint[] = serie
    .filter(d => mulcDict[d.fecha])
    .map(d => ({
      fecha: d.fecha,
      valor: Math.round(d.valor / mulcDict[d.fecha] * 1000) / 10,
    }));

  const prom5ruedas = Math.round(acum5ruedas / ultimas5.length * 10) / 10;

  return {
    hoy: compraDiaria,
    fechaHoy: last.fecha,
    acumMes: Math.round(acumMes * 10) / 10,
    acumAnio: Math.round(acumAnio * 10) / 10,
    pctMulcHoy,
    volMulcHoy,
    acum5ruedas: Math.round(acum5ruedas * 10) / 10,
    prom5ruedas,
    pctPromedio5ruedas: Math.round(pctPromedio5ruedas * 10) / 10,
    serieCompras: serie,
    seriePct,
  };
}
