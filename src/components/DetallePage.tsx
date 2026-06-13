'use client';

import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import { useState, useMemo } from 'react';
import type { IndicadorSummary } from '@/lib/data';
import type { Hito } from '@/lib/hitos';
import { TAG_LABELS } from '@/lib/hitos';
import styles from './DetallePage.module.css';

export type IndicadorTipo = 'riesgo-pais' | 'reservas' | 'compras';

const RANGOS = [
  { label: '1M', dias: 30 },
  { label: '3M', dias: 90 },
  { label: '6M', dias: 180 },
  { label: '1A', dias: 365 },
  { label: '3A', dias: 365 * 3 },
  { label: '5A', dias: 365 * 5 },
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
  if (totalDias > 90) return `${meses[parseInt(m) - 1]} ${y.slice(2)}`;
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
}

export default function DetallePage({
  titulo, subtitulo, data, hitos, accentColor, tipo, back,
}: Props) {
  const [rangoIdx, setRangoIdx] = useState(3);
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [modoCustom, setModoCustom] = useState(false);

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
          <div className={styles.kpiDelta} style={{ color: deltaColor }}>
            {sube ? '▲' : '▼'} {Math.abs(data.variacionPct).toFixed(1)}% vs rueda anterior
          </div>
          <div className={styles.kpiFecha}>al {formatFecha(data.fecha)}</div>
        </div>
      </header>

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
          <input
            type="date"
            className={styles.dateInput}
            value={customDesde}
            min="2000-01-01"
            max={customHasta || new Date().toISOString().slice(0,10)}
            onChange={e => setCustomDesde(e.target.value)}
          />
          <span className={styles.customLabel}>Hasta</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customHasta}
            min={customDesde || '2000-01-01'}
            max={new Date().toISOString().slice(0,10)}
            onChange={e => setCustomHasta(e.target.value)}
          />
        </div>
      )}

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.18} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Roboto Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => shortDate(v, totalDias)}
              interval="preserveStartEnd"
              angle={-35}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6e7f8d', fontFamily: 'Roboto Mono' }}
              tickLine={false}
              axisLine={false}
              width={65}
              tickFormatter={(v: number) => {
                if (Math.abs(v) >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
                return v.toString();
              }}
            />
            <Tooltip
              contentStyle={{
                background: '#13181f',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'Roboto Mono',
              }}
              labelStyle={{ color: '#adbac7', marginBottom: 4 }}
              itemStyle={{ color: accentColor }}
              labelFormatter={(v: string) => formatFecha(v)}
              formatter={(v: number) => [formatValor(tipo, v), '']}
            />
            {hitosEnRango.map(h => (
              <ReferenceLine
                key={h.id}
                x={h.fecha}
                stroke={TAG_COLORS[h.tag]}
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
            ))}
            <Area
              type="monotone"
              dataKey="valor"
              stroke={accentColor}
              strokeWidth={2}
              fill="url(#areaGrad)"
              dot={false}
              activeDot={{ r: 4, fill: accentColor, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {hitosEnRango.length > 0 && (
        <div className={styles.hitosSection}>
          <div className={styles.hitosTitle}>Hitos en el período</div>
          {[...hitosEnRango]
            .sort((a, b) => b.fecha.localeCompare(a.fecha))
            .map(h => (
              <div key={h.id} className={styles.hitoItem}>
                <div className={styles.hitoLeft}>
                  <div className={styles.hitoDot} style={{ background: TAG_COLORS[h.tag] }} />
                </div>
                <div>
                  <div className={styles.hitoMeta}>
                    <span className={styles.hitoTag} style={{ color: TAG_COLORS[h.tag] }}>
                      {TAG_LABELS[h.tag]}
                    </span>
                    <span className={styles.hitoFecha}>{formatFecha(h.fecha)}</span>
                    {h.automatico && <span className={styles.hitoAuto}>auto</span>}
                  </div>
                  <div className={styles.hitoTitulo}>{h.titulo}</div>
                  {h.descripcion && (
                    <div className={styles.hitoDesc}>{h.descripcion}</div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}
