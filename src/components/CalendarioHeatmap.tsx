'use client';

import React, { useState, useMemo } from 'react';
import styles from './CalendarioHeatmap.module.css';

interface DiaData {
  fecha: string;
  compras: number;
  mulc: number;
  pct: number;
  siopel: number | null;
}

interface Props {
  datos: DiaData[];
}

function getColor(pct: number, compras: number): string {
  if (compras < 0)  return 'var(--red)';
  if (pct === 0)    return 'rgba(255,255,255,0.04)';
  if (pct < 10)     return 'rgba(63,185,80,0.20)';
  if (pct < 20)     return 'rgba(63,185,80,0.45)';
  if (pct < 35)     return 'rgba(63,185,80,0.70)';
  return             'rgba(63,185,80,0.95)';
}

function getDotColor(compras: number): string {
  if (compras > 25) return 'var(--green)';
  if (compras < 0)  return 'var(--red)';
  return 'var(--text-tertiary)';
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA = ['L','M','X','J','V'];

function getMesKey(fecha: string) { return fecha.slice(0, 7); }

function diasDelMes(anio: number, mes: number): string[] {
  const dias: string[] = [];
  const total = new Date(anio, mes, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const f = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    dias.push(f); // todos los días, incluyendo fines de semana
  }
  return dias;
}

export default function CalendarioHeatmap({ datos }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaData | null>(null);

  const dataMap = useMemo(() => new Map(datos.map(d => [d.fecha, d])), [datos]);

  const meses = useMemo(() => {
    const set = new Set(datos.map(d => getMesKey(d.fecha)));
    return [...set].sort();
  }, [datos]);

  return (
    <div className={styles.wrap}>
      <button className={styles.header} onClick={() => { setAbierto(a => !a); setDiaSeleccionado(null); }}>
        <span className={styles.titulo}>Mapa de intervención 2026</span>
        <span className={`${styles.chevron} ${abierto ? styles.chevronOpen : ''}`}>›</span>
      </button>

      {abierto && (
        <>
          <div className={styles.leyenda}>
            <span className={styles.leyendaItem}><span className={styles.dot} style={{background:'var(--text-tertiary)'}} /> Neutral</span>
            <span className={styles.leyendaItem}><span className={styles.swatchLow} /> {'<'}10%</span>
            <span className={styles.leyendaItem}><span className={styles.swatchMid} /> 10–20%</span>
            <span className={styles.leyendaItem}><span className={styles.swatchHigh} /> 20–35%</span>
            <span className={styles.leyendaItem}><span className={styles.swatchMax} /> {'>'}35%</span>
            <span className={styles.leyendaItem}><span className={styles.swatchRed} /> Venta</span>
          </div>

          <div className={styles.grid}>
            {meses.map(mesKey => {
              const [anio, mes] = mesKey.split('-').map(Number);
              const diasTodos = diasDelMes(anio, mes);
              return (
                <div key={mesKey} className={styles.mes}>
                  <div className={styles.mesLabel}>{MESES[mes - 1]}</div>
                  <div className={styles.diasHeader}>
                    {DIAS_SEMANA.map(d => <span key={d} className={styles.diaSemana}>{d}</span>)}
                  </div>
                  <div className={styles.dias}>
                    {(() => {
                      const cells: React.ReactNode[] = [];
                      // Offset: días vacíos antes del lunes de la primera semana
                      const primerDia = new Date(`${mesKey}-01T12:00:00`);
                      const dowPrimer = primerDia.getDay(); // 0=dom,1=lun...6=sab
                      const offset = dowPrimer === 0 ? 4 : dowPrimer === 6 ? 4 : dowPrimer - 1;
                      for (let i = 0; i < offset; i++) {
                        cells.push(<div key={`off-${i}`} className={styles.celdaVacia} />);
                      }
                      diasTodos.forEach(fecha => {
                        const jsDay = new Date(fecha + 'T12:00:00').getDay(); // 0=dom,6=sab
                        // Saltar fines de semana
                        if (jsDay === 0 || jsDay === 6) return;
                        const d = dataMap.get(fecha);
                        const pct  = d ? d.pct : 0;
                        const comp = d ? d.compras : 0;
                        const color = d ? getColor(pct, comp) : 'transparent';
                        const dot   = getDotColor(comp);
                        const activo = diaSeleccionado?.fecha === fecha;
                        if (d) {
                          cells.push(
                            <div
                              key={fecha}
                              className={`${styles.celda} ${activo ? styles.celdaActiva : ''}`}
                              style={{ background: color }}
                              onClick={() => setDiaSeleccionado(activo ? null : (d ?? null))}
                              title={fecha}
                            >
                              <span className={styles.celdaDot} style={{ background: dot }} />
                            </div>
                          );
                        } else {
                          // Día hábil sin dato (feriado)
                          cells.push(<div key={fecha} className={styles.celdaFeriado} />);
                        }
                      });
                      return cells;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Histograma de distribución */}
          {(() => {
            const rangos = [
              { label: 'Venta',     min: -Infinity, max: -0.01, color: 'var(--red)' },
              { label: '0–25 MM',   min: -0.01,     max: 25,    color: 'rgba(63,185,80,0.25)' },
              { label: '25–75 MM',  min: 25,        max: 75,    color: 'rgba(63,185,80,0.45)' },
              { label: '75–150 MM', min: 75,        max: 150,   color: 'rgba(63,185,80,0.65)' },
              { label: '150–300 MM',min: 150,       max: 300,   color: 'rgba(63,185,80,0.82)' },
              { label: '+300 MM',   min: 300,       max: Infinity, color: 'rgba(63,185,80,0.97)' },
            ];
            const counts = rangos.map(r => ({
              ...r,
              dias: datos.filter(d => d.compras > r.min && d.compras <= r.max).length,
            }));
            const maxDias = Math.max(...counts.map(c => c.dias));
            return (
              <div className={styles.histoWrap}>
                <div className={styles.histoTitulo}>Distribución de compras</div>
                {counts.map((r, i) => (
                  <div key={i} className={styles.histoBarra}>
                    <span className={styles.histoLabel}>{r.label}</span>
                    <div className={styles.histoBarWrap}>
                      <div
                        className={styles.histoBarFill}
                        style={{
                          width: maxDias > 0 ? `${(r.dias / maxDias) * 100}%` : '0%',
                          background: r.color,
                        }}
                      />
                    </div>
                    <span className={styles.histoMeta}>
                      {r.dias} {r.dias === 1 ? 'día' : 'días'} · {datos.length > 0 ? Math.round(r.dias / datos.length * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          {diaSeleccionado && (
            <div className={styles.detalle}>
              <div className={styles.detalleHeader}>
                <span className={styles.detalleFecha}>
                  {new Date(diaSeleccionado.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </span>
                <button className={styles.cerrar} onClick={() => setDiaSeleccionado(null)}>✕</button>
              </div>
              <div className={styles.detalleGrid}>
                <div className={styles.detalleItem}>
                  <span className={styles.detalleLabel}>Compra BCRA</span>
                  <span className={styles.detalleValor} style={{
                    color: diaSeleccionado.compras >= 0 ? 'var(--green)' : 'var(--red)'
                  }}>
                    {diaSeleccionado.compras >= 0 ? '+' : ''}{diaSeleccionado.compras.toLocaleString('es-AR')} MM
                  </span>
                </div>
                <div className={styles.detalleItem}>
                  <span className={styles.detalleLabel}>Volumen MULC</span>
                  <span className={styles.detalleValor}>{diaSeleccionado.mulc.toLocaleString('es-AR')} MM</span>
                </div>
                <div className={styles.detalleItem}>
                  <span className={styles.detalleLabel}>Participación</span>
                  <span className={styles.detalleValor} style={{color: 'var(--green)'}}>
                    {diaSeleccionado.pct.toFixed(1)}%
                  </span>
                </div>
                <div className={styles.detalleItem}>
                  <span className={styles.detalleLabel}>SIOPEL</span>
                  <span className={styles.detalleValor}>
                    {diaSeleccionado.siopel
                      ? `$${diaSeleccionado.siopel.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
