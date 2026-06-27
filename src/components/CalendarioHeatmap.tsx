'use client';

import { useState, useMemo } from 'react';
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
  if (compras > 25)  return 'var(--green)';
  if (compras < 0)   return 'var(--red)';
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
    const dow = new Date(f).getDay();
    if (dow !== 0 && dow !== 6) dias.push(f);
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
              const diasHabiles = diasDelMes(anio, mes);
              return (
                <div key={mesKey} className={styles.mes}>
                  <div className={styles.mesLabel}>{MESES[mes - 1]}</div>
                  <div className={styles.diasHeader}>
                    {DIAS_SEMANA.map(d => <span key={d} className={styles.diaSemana}>{d}</span>)}
                  </div>
                  <div className={styles.dias}>
                    {(() => {
                      const primerDia = new Date(diasHabiles[0]);
                      const offset = primerDia.getDay() - 1;
                      const cells = [];
                      for (let i = 0; i < offset; i++) {
                        cells.push(<div key={`off-${i}`} className={styles.celdaVacia} />);
                      }
                      diasHabiles.forEach(fecha => {
                        const d = dataMap.get(fecha);
                        const pct   = d ? d.pct : 0;
                        const comp  = d ? d.compras : 0;
                        const color = getColor(pct, comp);
                        const dot   = getDotColor(comp);
                        const activo = diaSeleccionado?.fecha === fecha;
                        cells.push(
                          <div
                            key={fecha}
                            className={`${styles.celda} ${activo ? styles.celdaActiva : ''}`}
                            style={{ background: color }}
                            onClick={() => setDiaSeleccionado(activo ? null : (d ?? null))}
                            title={fecha}
                          >
                            {d && <span className={styles.celdaDot} style={{ background: dot }} />}
                          </div>
                        );
                      });
                      return cells;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

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

// Escala no lineal % MULC → color
function getColor(pct: number, compras: number): string {
  if (compras < 0)  return 'var(--red)';           // venta
  if (pct === 0)    return 'rgba(255,255,255,0.04)'; // sin dato / neutral
  if (pct < 10)     return 'rgba(63,185,80,0.20)';  // verde muy claro
  if (pct < 20)     return 'rgba(63,185,80,0.45)';  // verde claro
  if (pct < 35)     return 'rgba(63,185,80,0.70)';  // verde medio
  return             'rgba(63,185,80,0.95)';         // verde intenso >35%
}

function getDotColor(compras: number): string {
  if (compras > 25)  return 'var(--green)';
  if (compras < 0)   return 'var(--red)';
  return 'var(--text-tertiary)';
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA = ['L','M','X','J','V'];

function getMesKey(fecha: string) { return fecha.slice(0, 7); } // "2026-01"

function diasDelMes(anio: number, mes: number): string[] {
  const dias: string[] = [];
  const total = new Date(anio, mes, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const f = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(f).getDay(); // 0=dom, 6=sab
    if (dow !== 0 && dow !== 6) dias.push(f);
  }
  return dias;
}

export default function CalendarioHeatmap({ datos }: Props) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaData | null>(null);

  const dataMap = useMemo(() => {
    return new Map(datos.map(d => [d.fecha, d]));
  }, [datos]);

  // Meses presentes en los datos
  const meses = useMemo(() => {
    const set = new Set(datos.map(d => getMesKey(d.fecha)));
    return [...set].sort();
  }, [datos]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.titulo}>Mapa de intervención 2026</span>
        <div className={styles.leyenda}>
          <span className={styles.leyendaItem}><span className={styles.dot} style={{background:'var(--text-tertiary)'}} /> Neutral</span>
          <span className={styles.leyendaItem}><span className={styles.swatchLow} /> {'<'}10%</span>
          <span className={styles.leyendaItem}><span className={styles.swatchMid} /> 10–20%</span>
          <span className={styles.leyendaItem}><span className={styles.swatchHigh} /> 20–35%</span>
          <span className={styles.leyendaItem}><span className={styles.swatchMax} /> {'>'}35%</span>
          <span className={styles.leyendaItem}><span className={styles.swatchRed} /> Venta</span>
        </div>
      </div>

      <div className={styles.grid}>
        {meses.map(mesKey => {
          const [anio, mes] = mesKey.split('-').map(Number);
          const diasHabiles = diasDelMes(anio, mes);

          return (
            <div key={mesKey} className={styles.mes}>
              <div className={styles.mesLabel}>{MESES[mes - 1]}</div>
              <div className={styles.diasHeader}>
                {DIAS_SEMANA.map(d => <span key={d} className={styles.diaSemana}>{d}</span>)}
              </div>
              <div className={styles.dias}>
                {/* Offset para empezar en el día correcto */}
                {(() => {
                  const primerDia = new Date(diasHabiles[0]);
                  const dow = primerDia.getDay(); // 1=lun...5=vie
                  const offset = dow - 1;
                  const cells = [];
                  for (let i = 0; i < offset; i++) {
                    cells.push(<div key={`off-${i}`} className={styles.celdaVacia} />);
                  }
                  diasHabiles.forEach(fecha => {
                    const d = dataMap.get(fecha);
                    const pct   = d ? d.pct : 0;
                    const comp  = d ? d.compras : 0;
                    const color = getColor(pct, comp);
                    const dot   = getDotColor(comp);
                    const activo = diaSeleccionado?.fecha === fecha;
                    cells.push(
                      <div
                        key={fecha}
                        className={`${styles.celda} ${activo ? styles.celdaActiva : ''}`}
                        style={{ background: color }}
                        onClick={() => setDiaSeleccionado(activo ? null : (d ?? null))}
                        title={fecha}
                      >
                        {d && <span className={styles.celdaDot} style={{ background: dot }} />}
                      </div>
                    );
                  });
                  return cells;
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel detalle del día */}
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
    </div>
  );
}
