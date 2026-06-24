'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './export.module.css';

interface RowData {
  fecha: string;
  mulc: number | null;
  compras: number | null;
  pct: number | null;
}

const PRESETS = [
  { label: 'Última semana', days: 7 },
  { label: 'Último mes',    days: 30 },
  { label: 'Últimos 3M',   days: 90 },
  { label: 'Todo 2026',    days: 999 },
];

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(n: number | null): string {
  if (n === null) return '—';
  return n.toFixed(1) + '%';
}

export default function ExportPage() {
  const router = useRouter();
  const hoy = new Date().toISOString().slice(0, 10);

  const [comprasData, setComprasData] = useState<{ f: string; v: number }[]>([]);
  const [mulcData,    setMulcData]    = useState<{ f: string; v: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(hoy);
  const [presetActivo, setPresetActivo] = useState<number | null>(1);

  useEffect(() => {
    Promise.all([
      fetch('/api/export-data').then(r => r.json()),
    ]).then(([d]) => {
      setComprasData(d.compras);
      setMulcData(d.mulc);
      setLoading(false);
    });
  }, []);

  const aplicarPreset = (days: number, idx: number) => {
    setPresetActivo(idx);
    const d = new Date();
    if (days === 999) {
      setDesde('2026-01-02');
    } else {
      d.setDate(d.getDate() - days);
      setDesde(d.toISOString().slice(0, 10));
    }
    setHasta(hoy);
  };

  const rows = useMemo((): RowData[] => {
    const mulcMap = new Map(mulcData.map(d => [d.f, d.v]));
    const comprasMap = new Map(comprasData.map(d => [d.f, d.v]));

    const fechas = [...new Set([...mulcData.map(d => d.f), ...comprasData.map(d => d.f)])]
      .filter(f => f >= desde && f <= hasta)
      .sort((a, b) => b.localeCompare(a)); // más reciente primero

    return fechas.map(f => {
      const mulc    = mulcMap.get(f) ?? null;
      const compras = comprasMap.get(f) ?? null;
      const pct     = mulc && compras !== null && mulc > 0 ? (compras / mulc) * 100 : null;
      return { fecha: f, mulc, compras, pct };
    });
  }, [comprasData, mulcData, desde, hasta]);

  const totales = useMemo(() => {
    const comprasSum = rows.reduce((acc, r) => acc + (r.compras ?? 0), 0);
    const mulcSum    = rows.reduce((acc, r) => acc + (r.mulc ?? 0), 0);
    const pctProm    = mulcSum > 0 ? (comprasSum / mulcSum) * 100 : null;
    return { comprasSum, mulcSum, pctProm };
  }, [rows]);

  const descargarExcel = async () => {
    const XLSX = await import('xlsx');

    const wsData = [
      ['Fecha', 'Vol. MULC (MM USD)', 'Compras BCRA (MM USD)', '% Compras s/ MULC'],
      ...rows.map(r => [
        r.fecha,
        r.mulc ?? '',
        r.compras ?? '',
        r.pct !== null ? parseFloat(r.pct.toFixed(2)) : '',
      ]),
      [],
      ['TOTALES', totales.mulcSum, totales.comprasSum, totales.pctProm !== null ? parseFloat(totales.pctProm.toFixed(2)) : ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Anchos de columna
    ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 22 }];

    // Estilo header (fila 1)
    const headerStyle = {
      font: { bold: true, color: { rgb: '0D1117' } },
      fill: { fgColor: { rgb: '78AEDE' } },
      alignment: { horizontal: 'center' },
      border: {
        bottom: { style: 'thin', color: { rgb: '000000' } },
      },
    };

    ['A1','B1','C1','D1'].forEach(cell => {
      if (ws[cell]) ws[cell].s = headerStyle;
    });

    // Estilo fila totales
    const totalRow = rows.length + 3;
    ['A','B','C','D'].forEach(col => {
      const cell = `${col}${totalRow}`;
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: '1C2333' } },
        };
      }
    });

    // Formato numérico para columnas B y C
    rows.forEach((_, i) => {
      const row = i + 2;
      const bCell = `B${row}`;
      const cCell = `C${row}`;
      const dCell = `D${row}`;
      if (ws[bCell]) ws[bCell].z = '#,##0';
      if (ws[cCell]) ws[cCell].z = '#,##0';
      if (ws[dCell]) ws[dCell].z = '0.00"%"';
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MULC vs Compras');

    const periodo = `${desde}_${hasta}`;
    XLSX.writeFile(wb, `RP-Reservas_MULC_${periodo}.xlsx`);
  };

  return (
    <main className={styles.main}>
      <div className={styles.wrapper}>

        {/* Header con tabs */}
        <div className={styles.header}>
          <div className={styles.tabs}>
            <button className={styles.tab} onClick={() => router.push('/admin')}>
              ← Carga
            </button>
            <button className={`${styles.tab} ${styles.tabActivo}`}>
              Exportar
            </button>
          </div>
          <h1 className={styles.titulo}>Exportar datos</h1>
        </div>

        {/* Filtros */}
        <div className={styles.filtros}>
          <div className={styles.presets}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                className={`${styles.preset} ${presetActivo === i ? styles.presetActivo : ''}`}
                onClick={() => aplicarPreset(p.days, i)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.rangoCustom}>
            <div className={styles.rangoField}>
              <label>Desde</label>
              <input
                type="date"
                value={desde}
                max={hasta}
                min="2026-01-02"
                onChange={e => { setDesde(e.target.value); setPresetActivo(null); }}
                className={styles.input}
              />
            </div>
            <div className={styles.rangoField}>
              <label>Hasta</label>
              <input
                type="date"
                value={hasta}
                min={desde}
                max={hoy}
                onChange={e => { setHasta(e.target.value); setPresetActivo(null); }}
                className={styles.input}
              />
            </div>
            <button className={styles.btnExcel} onClick={descargarExcel} disabled={rows.length === 0}>
              ↓ Descargar Excel
            </button>
          </div>
        </div>

        {/* Resumen */}
        {!loading && rows.length > 0 && (
          <div className={styles.resumen}>
            <div className={styles.resumenItem}>
              <span className={styles.resumenLabel}>Ruedas</span>
              <span className={styles.resumenValor}>{rows.length}</span>
            </div>
            <div className={styles.resumenItem}>
              <span className={styles.resumenLabel}>Vol. MULC acum.</span>
              <span className={styles.resumenValor}>{fmt(totales.mulcSum)} MM</span>
            </div>
            <div className={styles.resumenItem}>
              <span className={styles.resumenLabel}>Compras acum.</span>
              <span className={`${styles.resumenValor} ${totales.comprasSum >= 0 ? styles.verde : styles.rojo}`}>
                {totales.comprasSum >= 0 ? '+' : ''}{fmt(totales.comprasSum)} MM
              </span>
            </div>
            <div className={styles.resumenItem}>
              <span className={styles.resumenLabel}>% prom. MULC</span>
              <span className={styles.resumenValor}>{fmtPct(totales.pctProm)}</span>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className={styles.tablaWrapper}>
          {loading ? (
            <div className={styles.loading}>Cargando datos…</div>
          ) : rows.length === 0 ? (
            <div className={styles.loading}>Sin datos para el período seleccionado.</div>
          ) : (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className={styles.right}>Vol. MULC (MM)</th>
                  <th className={styles.right}>Compras BCRA (MM)</th>
                  <th className={styles.right}>% s/ MULC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.fecha}>
                    <td className={styles.fechaCell}>{r.fecha}</td>
                    <td className={styles.right}>{fmt(r.mulc)}</td>
                    <td className={`${styles.right} ${r.compras !== null && r.compras >= 0 ? styles.verde : styles.rojo}`}>
                      {r.compras !== null ? (r.compras >= 0 ? '+' : '') + fmt(r.compras) : '—'}
                    </td>
                    <td className={styles.right}>{fmtPct(r.pct)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td>TOTAL</td>
                  <td className={styles.right}>{fmt(totales.mulcSum)}</td>
                  <td className={`${styles.right} ${totales.comprasSum >= 0 ? styles.verde : styles.rojo}`}>
                    {totales.comprasSum >= 0 ? '+' : ''}{fmt(totales.comprasSum)}
                  </td>
                  <td className={styles.right}>{fmtPct(totales.pctProm)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}
