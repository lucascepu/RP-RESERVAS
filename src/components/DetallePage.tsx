'use client';

import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area,
  ComposedChart, BarChart, Bar, Line,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { useState, useMemo } from 'react';
import type { IndicadorSummary } from '@/lib/data';
import type { Hito } from '@/lib/hitos';
import { TAG_LABELS } from '@/lib/hitos';
import styles from './DetallePage.module.css';

export type IndicadorTipo = 'riesgo-pais' | 'reservas' | 'compras';

type DataPoint = { fecha: string; valor: number };

interface MulcData {
  pctHoy: number;
  volHoy: number;
  acum5ruedas: number;
  prom5ruedas: number;
  pctPromedio5: number;
  acumAnio: number;
  seriePct: DataPoint[];
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

function movingAverage(data: DataPoint[], n: number): DataPoint[] {
  return data.map((d, i) => {
    if (i < n - 1) return { fecha: d.fecha, valor: NaN };
    const slice = data.slice(i - n + 1, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.valor, 0) / n;
    return { fecha: d.fecha, valor: Math.round(avg * 10) / 10 };
  }).filter(d => !isNaN(d.valor));
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

function ScatterAnalisis({ data, seriePct, accentColor }: {
  data: DataPoint[];
  seriePct: DataPoint[];
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);

  const scatterData = useMemo(() => {
    const mulcMap = Object.fromEntries(seriePct.map(d => [d.fecha, d]));
    return data
      .filter(d => mulcMap[d.fecha])
      .map(d => {
        const pct = mulcMap[d.fecha].valor;
        const vol = pct > 0 ? Math.round(d.valor / pct * 100) : 0;
        return { fecha: d.fecha, compras: d.valor, vol, pct };
      })
      .filter(d => d.vol > 0);
  }, [data, seriePct]);

  if (!open) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
        >
          ＋ Ver análisis avanzado
        </button>
      </div>
    );
  }

  return (
    <div className="scatterWrap" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)' }}>
          Scatter: Compras BCRA vs Volumen MULC
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Ocultar ▲
        </button>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 30, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="vol" type="number" name="Vol. MULC"
            tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: number) => v + ' MM'}
            label={{ value: 'Volumen MULC (MM)', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#6e7f8d' }}
          />
          <YAxis
            dataKey="compras" type="number" name="Compras BCRA"
            tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
            tickLine={false} axisLine={false} width={50}
            tickFormatter={(v: number) => v + ' MM'}
          />
          <ZAxis range={[40, 40]} />
          <Tooltip
            contentStyle={{ background: '#13181f', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, fontSize: 12, fontFamily: 'Inter' }}
            formatter={(v: number, name: string) => {
              if (name === 'Vol. MULC') return [v + ' MM', 'Vol. MULC'];
              if (name === 'Compras BCRA') return [v + ' MM', 'Compras BCRA'];
              return [v, name];
            }}
            labelFormatter={(_, payload) => {
              if (payload && payload[0]) {
                const d = payload[0].payload;
                return `${d.fecha} · ${d.pct}% MULC`;
              }
              return '';
            }}
          />
          <Scatter data={scatterData} fill={accentColor} fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 4 }}>
        Cada punto = una rueda · {scatterData.length} días disponibles
      </div>
    </div>
  );
}

export default function DetallePage({
  titulo, subtitulo, data, hitos, accentColor, tipo, back, mulcData,
}: Props) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [rangoIdx, setRangoIdx] = useState(2);
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [modoCustom, setModoCustom] = useState(false);
  const [modoMensual, setModoMensual] = useState(false);
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
      dias = RANGOS[rangoIdx]?.dias ?? 180;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dias);
      desde = cutoff.toISOString().slice(0, 10);
      hasta = hoy;
    }

    const serie = data.serie.filter(d => d.fecha >= desde && d.fecha <= hasta);
    const hitosEnRango = hitos.filter(h => h.fecha >= desde && h.fecha <= hasta);
    return { serie, hitosEnRango, totalDias: dias };
  }, [rangoIdx, modoCustom, customDesde, customHasta, data.serie, hitos, hoy]);

  // Serie mensual
  const serieMensual = useMemo(() => {
    if (!mulcData) return [];
    const porMes: Record<string, { compras: number; dias: number }> = {};
    data.serie.forEach(d => {
      const mes = d.fecha.slice(0, 7);
      if (!porMes[mes]) porMes[mes] = { compras: 0, dias: 0 };
      porMes[mes].compras += d.valor;
      porMes[mes].dias += 1;
    });
    const pctPorMes: Record<string, number[]> = {};
    mulcData.seriePct.forEach(d => {
      const mes = d.fecha.slice(0, 7);
      if (!pctPorMes[mes]) pctPorMes[mes] = [];
      pctPorMes[mes].push(d.valor);
    });
    const mesesLabel = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => {
      const [y, m] = mes.split('-');
      const pcts = pctPorMes[mes] || [];
      const pctProm = pcts.length > 0
        ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length * 10) / 10
        : 0;
      return {
        fecha: mes,
        label: `${mesesLabel[parseInt(m)-1]} ${y.slice(2)}`,
        compras: Math.round(v.compras),
        pctProm,
        diasMes: v.dias,
        promDiario: Math.round(v.compras / v.dias),
      };
    });
  }, [data.serie, mulcData]);

  // Serie % para gráfico inferior
  const seriePctRango = useMemo(() => {
    if (!mulcData) return [];
    const desde = modoCustom && customDesde ? customDesde
      : (() => { const c = new Date(); c.setDate(c.getDate() - (RANGOS[rangoIdx]?.dias ?? 180)); return c.toISOString().slice(0,10); })();
    const hasta = modoCustom && customHasta ? customHasta : hoy;
    return mulcData.seriePct.filter(d => d.fecha >= desde && d.fecha <= hasta);
  }, [mulcData, rangoIdx, modoCustom, customDesde, customHasta, hoy]);

  const sube = data.variacion >= 0;
  const invertLogic = INVERT_LOGIC.includes(tipo);
  const esBueno = invertLogic ? !sube : sube;
  const deltaColor = esBueno ? 'var(--green)' : 'var(--red)';

  // MA
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
            {data.fecha === hoy ? `al ${formatFecha(data.fecha)}` : `último dato: ${formatFecha(data.fecha)}`}
          </div>
        </div>
      </header>

      {/* Panel MULC */}
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
              <div className={styles.mulcKpiLabel}>Prom. 5 ruedas</div>
              <div className={styles.mulcKpiValue}>{mulcData.prom5ruedas.toLocaleString('es-AR')} MM/día</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Acum: +{mulcData.acum5ruedas.toLocaleString('es-AR')} MM
              </div>
            </div>
            <div className={styles.mulcKpi}>
              <div className={styles.mulcKpiLabel}>Acum. 2026</div>
              <div className={styles.mulcKpiValue} style={{ color: 'var(--green)' }}>
                +{Math.round(mulcData.acumAnio).toLocaleString('es-AR')} MM
              </div>
            </div>
            <div className={styles.mulcKpi}>
              <div className={styles.mulcKpiLabel}>% prom. 5 ruedas</div>
              <div className={styles.mulcKpiValue}>{mulcData.pctPromedio5}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Selector de rango */}
      <div className={styles.rangeRow}>
        {RANGOS.map((r, i) => (
          <button key={r.label}
            className={`${styles.rangeBtn} ${!modoCustom && !modoMensual && rangoIdx === i ? styles.active : ''}`}
            onClick={() => { setRangoIdx(i); setModoCustom(false); setModoMensual(false); }}>
            {r.label}
          </button>
        ))}
        <button
          className={`${styles.rangeBtn} ${modoCustom ? styles.active : ''}`}
          onClick={() => { setModoCustom(true); setModoMensual(false); }}>
          Custom
        </button>
        {tipo === 'compras' && (
          <>
            <span className={styles.rangeSep}>|</span>
            <button
              className={`${styles.rangeBtn} ${modoMensual ? styles.active : ''}`}
              onClick={() => { setModoMensual(true); setModoCustom(false); }}>
              Mensual
            </button>
          </>
        )}
      </div>

      {modoCustom && (
        <div className={styles.customRow}>
          <span className={styles.customLabel}>Desde</span>
          <input type="date" className={styles.dateInput} value={customDesde}
            min="2000-01-01" max={customHasta || hoy}
            onChange={e => setCustomDesde(e.target.value)} />
          <span className={styles.customLabel}>Hasta</span>
          <input type="date" className={styles.dateInput} value={customHasta}
            min={customDesde || '2000-01-01'} max={hoy}
            onChange={e => setCustomHasta(e.target.value)} />
        </div>
      )}

      {/* Gráfico principal */}
      <div className={styles.chartWrap}>
        <div className={styles.chartHeader}>
          <div className={styles.chartLabel}>
            {modoMensual ? 'Compras mensuales BCRA (USD MM)' : tipo === 'compras' ? 'Compras diarias BCRA (USD MM)' : ''}
          </div>
          {tipo === 'compras' && !modoMensual && (
            <div className={styles.maToggle}>
              <button
                className={`${styles.maBtn} ${showMA ? styles.maBtnActive : ''}`}
                onClick={() => setShowMA(v => !v)}>
                {showMA ? 'Ocultar MA' : 'Mostrar MA'}
              </button>
            </div>
          )}
        </div>

        {modoMensual ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={serieMensual} margin={{ top: 8, right: 40, bottom: 20, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label"
                tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
                tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
                tickLine={false} axisLine={false} width={50} />
              <YAxis yAxisId="right" orientation="right"
                tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Inter' }}
                tickLine={false} axisLine={false} width={35}
                tickFormatter={(v: number) => v + '%'} />
              <Tooltip
                contentStyle={{ background: '#13181f', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, fontSize: 13, fontFamily: 'Inter' }}
                labelStyle={{ color: '#adbac7', marginBottom: 4 }}
                formatter={(v: number, name: string) => {
                  if (name === 'compras') return [v.toLocaleString('es-AR') + ' MM', 'Comprado'];
                  if (name === 'pctProm') return [v + '%', '% MULC prom.'];
                  return [v, name];
                }} />
              <Bar dataKey="compras" fill="var(--green)" fillOpacity={0.8} radius={[3,3,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="pctProm"
                stroke="#d29922" strokeWidth={1.5} dot={{ r: 3, fill: '#d29922' }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={serieConMA} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
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
                <Line type="monotone" dataKey="ma5" stroke="#d29922" strokeWidth={1.5}
                  dot={false} connectNulls={false} />
              )}
              {tipo === 'compras' && showMA && (
                <Line type="monotone" dataKey="ma20" stroke="#58a6ff" strokeWidth={1}
                  dot={false} connectNulls={false} strokeDasharray="4 2" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {tipo === 'compras' && !modoMensual && (
          <div className={styles.maLegend}>
            <span style={{ color: 'var(--green)' }}>─── </span>
            <span style={{ color: '#6e7f8d', fontSize: 11 }}>Diario</span>
            <span style={{ color: '#d29922', marginLeft: 12 }}>─── </span>
            <span style={{ color: '#6e7f8d', fontSize: 11 }}>MA 5 ruedas</span>
            <span style={{ color: '#58a6ff', marginLeft: 12 }}>- - - </span>
            <span style={{ color: '#6e7f8d', fontSize: 11 }}>MA 20 ruedas</span>
          </div>
        )}
        {tipo === 'compras' && modoMensual && (
          <div className={styles.maLegend}>
            <span style={{ color: 'var(--green)' }}>▬ </span>
            <span style={{ color: '#6e7f8d', fontSize: 11 }}>Compras acumuladas</span>
            <span style={{ color: '#d29922', marginLeft: 12 }}>─── </span>
            <span style={{ color: '#6e7f8d', fontSize: 11 }}>% MULC prom. mensual</span>
          </div>
        )}
      </div>

      {/* Gráfico % MULC */}
      {mulcData && seriePctRango.length > 0 && !modoMensual && (
        <div className={styles.mulcChartWrap}>
          <div className={styles.chartLabel}>Compras BCRA como % del volumen MULC</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={seriePctRango} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
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
                  return [v, name];
                }} />
              <ReferenceLine y={10} stroke="rgba(110,127,141,0.3)" strokeDasharray="2 4" />
              <ReferenceLine y={25} stroke="rgba(46,160,67,0.3)" strokeDasharray="2 4" />
              <ReferenceLine y={50} stroke="rgba(210,153,34,0.3)" strokeDasharray="2 4" />
              <ReferenceLine y={5} stroke="transparent"
                label={{ value: 'Marginal', position: 'insideTopRight', fontSize: 9, fill: 'rgba(110,127,141,0.5)' }} />
              <ReferenceLine y={17} stroke="transparent"
                label={{ value: 'Relevante', position: 'insideTopRight', fontSize: 9, fill: 'rgba(46,160,67,0.4)' }} />
              <ReferenceLine y={37} stroke="transparent"
                label={{ value: 'Dominante', position: 'insideTopRight', fontSize: 9, fill: 'rgba(210,153,34,0.4)' }} />
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

      {/* Análisis avanzado — Scatter */}
      {mulcData && !modoMensual && (
        <ScatterAnalisis data={data.serie} seriePct={mulcData.seriePct} accentColor={accentColor} />
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
