'use client';

import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area,
  ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { useState, useMemo } from 'react';
import type { IndicadorSummary } from '@/lib/data';
import type { Hito } from '@/lib/hitos';
import { TAG_LABELS } from '@/lib/hitos';
import styles from './DetallePage.module.css';

export type IndicadorTipo = 'riesgo-pais' | 'reservas' | 'compras';

interface MulcData {
  pctHoy: number;
  volHoy: number;
  acum5ruedas: number;
  pctPromedio5: number;
  acumAnio: number;
  seriePct: { fecha: string; valor: number }[];
}

const RANGOS = [
  { label: '1M', dias: 30 },
  { label: '3M', dias: 90 },
  { label: '6M', dias: 180 },
  { label: 'Todo', dias: 365 * 30 },
];

const TAG_COLORS: Record<string, string> = {
  deuda: '#58a6ff',
  politico: '#d29922',
  macro: '#8b949e',
  bcra: '#3fb950',
};

const INVERT_LOGIC: IndicadorTipo[] = ['riesgo-pais'];

function formatValor(tipo: IndicadorTipo, v: number): string {
  if (tipo === 'riesgo-pais') return v.toLocaleString('es-AR') + ' pbs';
  if (tipo === 'reservas') return 'USD ' + (v / 1000).toFixed(1) + ' MM';
  return (v >= 0 ? '+' : '') + v.toLocaleString('es-AR') + ' MM';
}

type DataPoint = { fecha: string; valor: number };

function movingAverage(data: DataPoint[], n: number): DataPoint[] {
  return data.map((d, i) => {
    if (i < n - 1) return { fecha: d.fecha, valor: NaN };
    const slice = data.slice(i - n + 1, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.valor, 0) / n;
    return { fecha: d.fecha, valor: Math.round(avg * 10) / 10 };
  }).filter(d => !isNaN(d.valor));
}

function formatFecha(iso: string) {
  const [y, m, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function shortDate(iso: string, totalDias: number) {
  const [y, m, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  if (totalDias > 365 * 2) return `${meses[parseInt(m) - 1]} ${y}`;
  if (totalDias > 365) return `${meses[parseInt(m) - 1]} '${y.slice(2)}`;
  return `${parseInt(d)} ${meses[parseInt(m) - 1]}`;
}

interface Props {
  titulo: string;
  subtitulo: string;
  data: IndicadorSummary;
  hitos: Hito[];
  accentColor: string;
  tipo: IndicadorTipo;
  back: string;
  mulcData?: MulcData;
}

export default function DetallePage({
  titulo, subtitulo, data, hitos, accentColor, tipo, back, mulcData,
}: Props) {
  const [rangoIdx, setRangoIdx] = useState(3);
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [modoCustom, setModoCustom] = useState(false);
  const [showMA, setShowMA] = useState(true);

  const { serie, hitosEnRango, totalDias } = useMemo(() => {
    let desde: string;
    let hasta: string;
    let dias: number;

    if (modoCustom && customDesde && customHasta) {
      desde = customDesde;
      hasta = customHasta;
      const ms = new Date(hasta).getTime() - new Date(desde).getTime();
      dias = Math.ceil(ms / 86400000);
    } else {
      dias = RANGOS[rangoIdx].dias;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dias);
      desde = cutoff.toISOString().slice(0, 10);
      hasta = new Date().toISOString().slice(0, 10);
    }

    const serie = data.serie.filter(d => d.fecha >= desde && d.fecha <= hasta);
    const hitosEnRango = hitos.filter(h => h.fecha >= desde && h.fecha <= hasta);
    return { serie, hitosEnRango, totalDias: dias };
  }, [rangoIdx, modoCustom, customDesde, customHasta, data.serie, hitos]);

  const sube = data.variacion >= 0;
  const invertLogic = INVERT_LOGIC.includes(tipo);
  const esBueno = invertLogic ? !sube : sube;
  const deltaColor = esBueno ? 'var(--green)' : 'var(--red)';

  // Serie % para el gráfico de barras (rango igual al selector)
  const seriePctRango = useMemo(() => {
    if (!mulcData) return [];
    const desde = modoCustom && customDesde ? customDesde
      : (() => { const c = new Date(); c.setDate(c.getDate() - RANGOS[rangoIdx].dias); return c.toISOString().slice(0,10); })();
    const hasta = modoCustom && customHasta ? customHasta : new Date().toISOString().slice(0,10);
    return mulcData.seriePct.filter(d => d.fecha >= desde && d.fecha <= hasta);
  }, [mulcData, rangoIdx, modoCustom, customDesde, customHasta]);

  return (
    <main className={styles.main}>
      <div className={styles.breadcrumb}>
        <Link href={back} className={styles.back}>← Volver</Link>
      </div>

      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>{titulo}</h1>
          <p className={styles.subtitulo}>{subtitulo}</p>
        </div>
        <div className={styles.kpiBox}>
          <div className={styles.kpiValue} style={{ color: accentColor }}>
            {formatValor(tipo, data.ultimo)}
          </div>
          {tipo !== 'compras' && (
            <div className={styles.kpiDelta} style={{ color: deltaColor }}>
              {sube ? '▲' : '▼'} {Math.abs(data.variacionPct).toFixed(1)}% vs rueda anterior
            </div>
          )}
          <div className={styles.kpiFecha}>
            {(() => {
              const hoy = new Date().toISOString().slice(0, 10);
              const esHoy = data.fecha === hoy;
              return esHoy
                ? `al ${formatFecha(data.fecha)}`
                : `último dato: ${formatFecha(data.fecha)}`;
            })()}
          </div>
        </div>
      </header>

      {/* Panel MULC — solo para compras */}
      {mulcData && (
        <div className={styles.mulcPanel}>
          <div className={styles.mulcKpis}>
            <div className={styles.mulcKpi}>
              <div className={styles.mulcKpiLabel}>% MULC últ. rueda</div>
              <div className={styles.mulcKpiValue} style={{ color: 'var(--green)' }}>
                {mulcData.pctHoy}%
              </div>
            </div>
            <div className={styles.mulcKpi}>
              <div className={styles.mulcKpiLabel}>Vol. MULC últ. rueda</div>
              <div className={styles.mulcKpiValue}>{mulcData.volHoy.toLocaleString('es-AR')} MM</div>
            </div>
            <div className={styles.mulcKpi}>
              <div className={styles.mulcKpiLabel}>Últ. 5 ruedas</div>
              <div className={styles.mulcKpiValue}>+{mulcData.acum5ruedas.toLocaleString('es-AR')} MM</div>
            </div>
            <div className={styles.mulcKpi}>
              <div className={styles.mulcKpiLabel}>% prom. 5 ruedas</div>
              <div className={styles.mulcKpiValue}>{mulcData.pctPromedio5}%</div>
            </div>
            <div className={styles.mulcKpi}>
              <div className={styles.mulcKpiLabel}>Acum. 2026</div>
              <div className={styles.mulcKpiValue} style={{ color: 'var(--green)' }}>
                +{Math.round(mulcData.acumAnio).toLocaleString('es-AR')} MM
              </div>
            </div>
          </div>
        </div>
      )}

      {kpiMensual && (
        <div className={styles.mensualPanel}>
          <div className={styles.mensualTitulo}>
            {kpiMensual.mesNombre.charAt(0).toUpperCase() + kpiMensual.mesNombre.slice(1)} 2026
          </div>
          <div className={styles.mensualKpis}>
            <div className={styles.mensualKpi}>
              <div className={styles.mensualLabel}>Comprado</div>
              <div className={styles.mensualVal} style={{ color: 'var(--green)' }}>
                +{kpiMensual.compradoMes.toLocaleString('es-AR')} MM
              </div>
            </div>
            <div className={styles.mensualKpi}>
              <div className={styles.mensualLabel}>Prom. diario</div>
              <div className={styles.mensualVal}>{kpiMensual.promDiario} MM</div>
            </div>
            <div className={styles.mensualKpi}>
              <div className={styles.mensualLabel}>% MULC prom.</div>
              <div className={styles.mensualVal}>{kpiMensual.pctPromMes}%</div>
            </div>
            <div className={styles.mensualKpi}>
              <div className={styles.mensualLabel}>Ruedas</div>
              <div className={styles.mensualVal}>{kpiMensual.diasMes}</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.rangeRow}>
        {RANGOS.map((r, i) => (
          <button
            key={r.label}
            className={`${styles.rangeBtn} ${!modoCustom && rangoIdx === i ? styles.active : ''}`}
            onClick={() => { setRangoIdx(i); setModoCustom(false); }}
          >
            {r.label}
          </button>
        ))}
        <button
          className={`${styles.rangeBtn} ${modoCustom ? styles.active : ''}`}
          onClick={() => setModoCustom(true)}
        >
          Custom
        </button>
      </div>

      {modoCustom && (
        <div className={styles.customRow}>
          <span className={styles.customLabel}>Desde</span>
          <input type="date" className={styles.dateInput} value={customDesde}
            min="2000-01-01" max={customHasta || new Date().toISOString().slice(0,10)}
            onChange={e => setCustomDesde(e.target.value)} />
          <span className={styles.customLabel}>Hasta</span>
          <input type="date" className={styles.dateInput} value={customHasta}
            min={customDesde || '2000-01-01'} max={new Date().toISOString().slice(0,10)}
            onChange={e => setCustomHasta(e.target.value)} />
        </div>
      )}

      {/* Gráfico principal */}
      <div className={styles.chartWrap}>
        <div className={styles.chartHeader}>
          <div className={styles.chartLabel}>
            {tipo === 'compras' ? 'Compras diarias BCRA (USD MM)' : ''}
          </div>
          {tipo === 'compras' && (
            <div className={styles.maToggle}>
              <button
                className={`${styles.maBtn} ${showMA ? styles.maBtnActive : ''}`}
                onClick={() => setShowMA(v => !v)}
              >
                {showMA ? 'Ocultar MA' : 'Mostrar MA'}
              </button>
            </div>
          )}
        </div>
        {(() => {
          const ma5 = tipo === 'compras' ? movingAverage(serie, 5) : [];
          const ma20 = tipo === 'compras' ? movingAverage(serie, 20) : [];
          const ma5Map = Object.fromEntries(ma5.map(d => [d.fecha, d.valor]));
          const ma20Map = Object.fromEntries(ma20.map(d => [d.fecha, d.valor]));
          const serieConMA = serie.map(d => ({
            ...d,
            ma5: ma5Map[d.fecha],
            ma20: ma20Map[d.fecha],
          }));
          return (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={tipo === 'compras' ? serieConMA : serie} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="fecha"
                  tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v) => shortDate(v, totalDias)}
                  interval="preserveStartEnd" angle={-35} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
                  tickLine={false} axisLine={false} width={55}
                  tickFormatter={(v: number) => {
                    if (Math.abs(v) >= 1000) return (v/1000).toFixed(1) + 'k';
                    return v.toString();
                  }} />
                <Tooltip
                  contentStyle={{ background: '#13181f', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, fontSize: 13, fontFamily: 'Inter' }}
                  labelStyle={{ color: '#adbac7', marginBottom: 4 }}
                  labelFormatter={(v: string) => formatFecha(v)}
                  formatter={(v: number, name: string) => {
                    if (name === 'valor') return [formatValor(tipo, v), 'Diario'];
                    if (name === 'ma5') return [formatValor(tipo, v), 'MA 5'];
                    if (name === 'ma20') return [formatValor(tipo, v), 'MA 20'];
                    return [v, name];
                  }} />
                <Area type="monotone" dataKey="valor" stroke={accentColor} strokeWidth={1.5}
                  fill="url(#areaGrad)" dot={false}
                  activeDot={{ r: 4, fill: accentColor, strokeWidth: 0 }} />
                {tipo === 'compras' && showMA && (
                  <Line type="monotone" dataKey="ma5" stroke="#d29922" strokeWidth={2}
                    dot={false} connectNulls={false} strokeDasharray="0" />
                )}
                {tipo === 'compras' && showMA && (
                  <Line type="monotone" dataKey="ma20" stroke="#58a6ff" strokeWidth={2}
                    dot={false} connectNulls={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          );
        })()}
      </div>

      {tipo === 'compras' && (
        <div className={styles.maLegend}>
          <span style={{ color: 'var(--green)' }}>─── </span>
          <span style={{ color: '#6e7f8d', fontSize: 11 }}>Diario</span>
          <span style={{ color: '#d29922', marginLeft: 12 }}>─── </span>
          <span style={{ color: '#6e7f8d', fontSize: 11 }}>MA 5 ruedas</span>
          <span style={{ color: '#58a6ff', marginLeft: 12 }}>─── </span>
          <span style={{ color: '#6e7f8d', fontSize: 11 }}>MA 20 ruedas</span>
        </div>
      )}

      {/* Gráfico % MULC — solo para compras */}
      {mulcData && seriePctRango.length > 0 && (
        <div className={styles.mulcChartWrap}>
          <div className={styles.chartLabel}>Compras BCRA como % del volumen MULC</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={seriePctRango} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
              <defs>
                <linearGradient id="bandaMarginal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6e7f8d" stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id="bandaRelevante" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ea043" stopOpacity={0.07} />
                </linearGradient>
                <linearGradient id="bandaDominante" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d29922" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="bandaFuerte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f85149" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="fecha"
                tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
                tickLine={false} axisLine={false}
                tickFormatter={(v) => shortDate(v, totalDias)}
                interval="preserveStartEnd" angle={-35} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
                tickLine={false} axisLine={false} width={40}
                tickFormatter={(v: number) => v + '%'}
                domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ background: '#13181f', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, fontSize: 13, fontFamily: 'Inter' }}
                labelStyle={{ color: '#adbac7', marginBottom: 4 }}
                labelFormatter={(v: string) => formatFecha(v)}
                formatter={(v: number, name: string) => {
                  if (name === 'valor') return [v + '%', '% MULC'];
                  if (name === 'ma20pct') return [v + '%', 'MA 20'];
                  return [v, name];
                }} />
              {/* Bandas de interpretación */}
              <ReferenceLine y={10} stroke="rgba(110,127,141,0.3)" strokeDasharray="2 4" />
              <ReferenceLine y={25} stroke="rgba(46,160,67,0.3)" strokeDasharray="2 4" />
              <ReferenceLine y={50} stroke="rgba(210,153,34,0.3)" strokeDasharray="2 4" />
              {/* Labels de bandas */}
              <ReferenceLine y={5} stroke="transparent"
                label={{ value: 'Marginal', position: 'insideTopRight', fontSize: 9, fill: 'rgba(110,127,141,0.5)' }} />
              <ReferenceLine y={17} stroke="transparent"
                label={{ value: 'Relevante', position: 'insideTopRight', fontSize: 9, fill: 'rgba(46,160,67,0.4)' }} />
              <ReferenceLine y={37} stroke="transparent"
                label={{ value: 'Dominante', position: 'insideTopRight', fontSize: 9, fill: 'rgba(210,153,34,0.4)' }} />
              {/* MA 20 punteada */}
              <ReferenceLine y={mulcData.pctPromedio5} stroke="#d29922" strokeDasharray="4 4" strokeOpacity={0.7} />
              <Line type="monotone" dataKey="valor" stroke="var(--green)" strokeWidth={2}
                dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className={styles.mulcLegend}>
            <span style={{ color: 'var(--green)' }}>─── </span>
            <span style={{ color: '#6e7f8d', fontSize: 11 }}>% MULC diario</span>
            <span style={{ color: '#d29922', marginLeft: 12 }}>- - - </span>
            <span style={{ color: '#6e7f8d', fontSize: 11 }}>Prom. 5 ruedas: {mulcData.pctPromedio5}%</span>
          </div>
        </div>
      )}

      {hitosEnRango.length > 0 && (
        <div className={styles.hitosSection}>
          <div className={styles.hitosTitle}>Hitos en el período</div>
          {[...hitosEnRango].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(h => (
            <div key={h.id} className={styles.hitoItem}>
              <div className={styles.hitoLeft}>
                <div className={styles.hitoDot} style={{ background: TAG_COLORS[h.tag] }} />
              </div>
              <div>
                <div className={styles.hitoMeta}>
                  <span className={styles.hitoTag} style={{ color: TAG_COLORS[h.tag] }}>{TAG_LABELS[h.tag]}</span>
                  <span className={styles.hitoFecha}>{formatFecha(h.fecha)}</span>
                </div>
                <div className={styles.hitoTitulo}>{h.titulo}</div>
                {h.descripcion && <div className={styles.hitoDesc}>{h.descripcion}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
