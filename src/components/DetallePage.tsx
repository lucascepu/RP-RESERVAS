'use client';

import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import { useState } from 'react';
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
];

const TAG_COLORS: Record<string, string> = {
  deuda: '#58a6ff',
  politico: '#d29922',
  macro: '#8b949e',
  bcra: '#3fb950',
};

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

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
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
  const [rango, setRango] = useState(90);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rango);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const serie = data.serie.filter(d => d.fecha >= cutoffStr);
  const hitosEnRango = hitos.filter(h => h.fecha >= cutoffStr);

  const chartData = serie.map(d => ({
    fecha: d.fecha,
    valor: d.valor,
  }));

  const sube = data.variacion >= 0;

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
          <div className={`${styles.kpiDelta} ${sube ? styles.up : styles.down}`}>
            {sube ? '▲' : '▼'} {Math.abs(data.variacionPct).toFixed(1)}% vs rueda anterior
          </div>
          <div className={styles.kpiFecha}>al {formatFecha(data.fecha)}</div>
        </div>
      </header>

      <div className={styles.rangeRow}>
        {RANGOS.map(r => (
          <button
            key={r.dias}
            className={`${styles.rangeBtn} ${rango === r.dias ? styles.active : ''}`}
            onClick={() => setRango(r.dias)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 10, fill: '#484f58', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={shortDate}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#484f58', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: '#161b22',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'IBM Plex Mono',
              }}
              labelStyle={{ color: '#8b949e', marginBottom: 4 }}
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
