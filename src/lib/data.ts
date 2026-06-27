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
  vol5ruedas: number;
  pctAcum5ruedas: number;
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
      acum5ruedas: 0, vol5ruedas: 0, pctAcum5ruedas: 0, prom5ruedas: 0, pctPromedio5ruedas: 0,
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
  const vol5ruedas = ultimas5.reduce((sum, d) => sum + (mulcDict[d.fecha] ?? 0), 0);
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
  const pctAcum5ruedas = vol5ruedas > 0 ? Math.round(acum5ruedas / vol5ruedas * 1000) / 10 : 0;

  return {
    hoy: compraDiaria,
    fechaHoy: last.fecha,
    acumMes: Math.round(acumMes * 10) / 10,
    acumAnio: Math.round(acumAnio * 10) / 10,
    pctMulcHoy,
    volMulcHoy,
    acum5ruedas: Math.round(acum5ruedas * 10) / 10,
    vol5ruedas: Math.round(vol5ruedas * 10) / 10,
    pctAcum5ruedas,
    prom5ruedas,
    pctPromedio5ruedas: Math.round(pctPromedio5ruedas * 10) / 10,
    serieCompras: serie,
    seriePct,
  };
}

// ── Panel Estado del Régimen Cambiario ──────────────────────────────────────

export interface RegimenSignal {
  label: string;
  valor: string;
  descripcion: string;
  color: 'green' | 'yellow' | 'red' | 'neutral';
}

export interface RegimenEstado {
  signals: RegimenSignal[];
  resumen: string;
  tono: 'comprador' | 'moderado' | 'cauteloso' | 'vendedor';
}

export function calcularRegimen(compras: ComprasSummary): RegimenEstado {
  const PROM_ANUAL_PCT  = 20.7;  // % MULC promedio 2026
  const PROM_ANUAL_MM   = 94.8;  // MM/día promedio 2026
  const signals: RegimenSignal[] = [];

  // — Señal 1: Compra diaria —
  const hoy = compras.hoy;
  let s1: RegimenSignal;
  if (hoy < 0) {
    s1 = { label: 'Compra diaria', valor: `${hoy} MM`, descripcion: 'Vendió divisas en el día', color: 'red' };
  } else if (hoy <= 25) {
    s1 = { label: 'Compra diaria', valor: `+${hoy} MM`, descripcion: 'Intervención mínima', color: 'neutral' };
  } else if (hoy <= 75) {
    s1 = { label: 'Compra diaria', valor: `+${hoy} MM`, descripcion: 'Compra moderada', color: 'yellow' };
  } else if (hoy <= 150) {
    s1 = { label: 'Compra diaria', valor: `+${hoy} MM`, descripcion: 'Compra elevada', color: 'green' };
  } else {
    s1 = { label: 'Compra diaria', valor: `+${hoy} MM`, descripcion: 'Compra muy elevada', color: 'green' };
  }
  signals.push(s1);

  // — Señal 2: Participación MULC —
  const pct = compras.pctMulcHoy;
  const diffPct = pct - PROM_ANUAL_PCT;
  const diffPctStr = diffPct >= 0 ? `+${diffPct.toFixed(1)}pp vs promedio anual` : `${diffPct.toFixed(1)}pp vs promedio anual`;
  let s2: RegimenSignal;
  if (pct < 10) {
    s2 = { label: 'Participación MULC', valor: `${pct}%`, descripcion: `Baja · ${diffPctStr}`, color: 'neutral' };
  } else if (pct <= 20) {
    s2 = { label: 'Participación MULC', valor: `${pct}%`, descripcion: `Normal · ${diffPctStr}`, color: 'yellow' };
  } else {
    s2 = { label: 'Participación MULC', valor: `${pct}%`, descripcion: `Elevada · ${diffPctStr}`, color: 'green' };
  }
  signals.push(s2);

  // — Señal 3: Últimas 5 ruedas vs promedio anual —
  const prom5 = compras.prom5ruedas;
  const diff5 = ((prom5 - PROM_ANUAL_MM) / PROM_ANUAL_MM) * 100;
  const diff5Str = diff5 >= 0 ? `+${diff5.toFixed(0)}% vs promedio anual` : `${diff5.toFixed(0)}% vs promedio anual`;
  let s3: RegimenSignal;
  if (diff5 > 20) {
    s3 = { label: 'Ritmo últ. 5 ruedas', valor: `${prom5} MM/día`, descripcion: `Acelerado · ${diff5Str}`, color: 'green' };
  } else if (diff5 >= -20) {
    s3 = { label: 'Ritmo últ. 5 ruedas', valor: `${prom5} MM/día`, descripcion: `En línea · ${diff5Str}`, color: 'yellow' };
  } else {
    s3 = { label: 'Ritmo últ. 5 ruedas', valor: `${prom5} MM/día`, descripcion: `Desacelerado · ${diff5Str}`, color: 'neutral' };
  }
  signals.push(s3);

  // — Señal 4: Acumulado 2026 —
  const acum = Math.round(compras.acumAnio);
  const pctAnual = compras.pctAcum5ruedas; // reutilizo el % acum general
  signals.push({
    label: 'Acumulado 2026',
    valor: `+${acum.toLocaleString('es-AR')} MM`,
    descripcion: `${compras.pctPromedio5ruedas}% promedio MULC en el año`,
    color: 'neutral',
  });

  // — Tono general —
  const greens = signals.filter(s => s.color === 'green').length;
  const reds   = signals.filter(s => s.color === 'red').length;
  let tono: RegimenEstado['tono'];
  let resumen: string;

  if (reds > 0) {
    tono = 'vendedor';
    resumen = 'El BCRA vendió divisas. Posible presión sobre el tipo de cambio.';
  } else if (greens >= 2) {
    tono = 'comprador';
    resumen = 'Régimen comprador activo. Intervención por encima del promedio anual.';
  } else if (greens === 1) {
    tono = 'moderado';
    resumen = 'Intervención moderada. En línea con el ritmo promedio del año.';
  } else {
    tono = 'cauteloso';
    resumen = 'Actividad baja. El BCRA redujo su participación en el MULC.';
  }

  return { signals, resumen, tono };
}

// ── Datos para CalendarioHeatmap ─────────────────────────────────────────────

export interface CalendarioDia {
  fecha: string;
  compras: number;
  mulc: number;
  pct: number;
  siopel: number | null;
}

export async function getCalendarioData(): Promise<CalendarioDia[]> {
  const [comprasRaw, mulcRaw, fxRaw] = await Promise.all([
    import('@/data/compras.json').then(m => m.default as {f:string;v:number}[]),
    import('@/data/mulc.json').then(m => m.default as {f:string;v:number;tc:number}[]),
    fetch('https://raw.githubusercontent.com/lucascepu/SEGUIMIENTO-FX/main/historical.json', { next: { revalidate: 3600 } })
      .then(r => r.json())
      .then((d: {'2026': {date:string;fx:number}[]}) => d['2026'])
      .catch(() => [] as {date:string;fx:number}[]),
  ]);

  const comprasMap = new Map(comprasRaw.map(d => [d.f, d.v]));
  const mulcMap    = new Map(mulcRaw.map(d => [d.f, d.v]));
  const siopelMap  = new Map(fxRaw.map(d => [d.date, d.fx]));

  const fechas = [...new Set([...comprasMap.keys(), ...mulcMap.keys()])].sort();

  return fechas.map(f => {
    const compras = comprasMap.get(f) ?? 0;
    const mulc    = mulcMap.get(f) ?? 0;
    const pct     = mulc > 0 ? Math.round(compras / mulc * 1000) / 10 : 0;
    return {
      fecha: f,
      compras,
      mulc,
      pct,
      siopel: siopelMap.get(f) ?? null,
    };
  });
}
