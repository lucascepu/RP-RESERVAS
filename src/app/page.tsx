import { getReservas, getRiesgoPais, getCompras } from '@/lib/data';
import KpiCard from '@/components/KpiCard';
import HitosPanel from '@/components/HitosPanel';
import styles from './page.module.css';

export const revalidate = 3600;

function fmtDelta(v: number, unit = 'MM') {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${Math.round(v).toLocaleString('es-AR')} ${unit}`;
}

export default async function Home() {
  const [rp, reservas, compras] = await Promise.allSettled([
    getRiesgoPais(),
    getReservas(),
    getCompras(),
  ]);

  const rpData = rp.status === 'fulfilled' ? rp.value : null;
  const resData = reservas.status === 'fulfilled' ? reservas.value : null;
  const compData = compras.status === 'fulfilled' ? compras.value : null;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <span className="mono">RP + Reservas</span>
          </h1>
          <p className={styles.sub}>Riesgo País · Reservas BCRA · Compras de divisas · Argentina</p>
        </div>
        {rpData && (
          <div className={styles.updated}>
            <span className="mono">Últ. dato: {rpData.fecha}</span>
          </div>
        )}
      </header>

      <section className={styles.cards}>
        {rpData ? (
          <KpiCard
            label="Riesgo País"
            value={rpData.ultimo.toLocaleString('es-AR')}
            unit="pbs"
            variacion={rpData.variacion}
            variacionPct={rpData.variacionPct}
            href="/riesgo-pais"
            accentColor="#a78bfa"
            invertLogic={true}
            subInfo={`YTD: ${fmtDelta(rpData.ytd, 'pbs')} · MTD: ${fmtDelta(rpData.mtd, 'pbs')}`}
          />
        ) : <CardError label="Riesgo País" />}

        {resData ? (
          <KpiCard
            label="Reservas Brutas"
            value={(resData.ultimo / 1000).toFixed(1)}
            unit="USD MM"
            variacion={Math.round(resData.variacion)}
            variacionPct={resData.variacionPct}
            href="/reservas"
            accentColor="var(--accent)"
            subInfo={`MTD: ${fmtDelta(resData.mtd)} · YTD: ${fmtDelta(resData.ytd)}`}
          />
        ) : <CardError label="Reservas" />}

        {compData ? (
          <KpiCard
            label="Compras BCRA"
            value={`+${compData.acumAnio.toLocaleString('es-AR')}`}
            unit="MM acum. 2026"
            href="/compras"
            accentColor="var(--green)"
            hideVariacion={true}
            subInfo={`Junio: +${compData.acumMes.toLocaleString('es-AR')} MM`}
            subInfo2={`${compData.ruedasConsecutivas} ruedas consecutivas comprando`}
          />
        ) : <CardError label="Compras BCRA" />}
      </section>

      <section>
        <HitosPanel />
      </section>
    </main>
  );
}

function CardError({ label }: { label: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '1.25rem',
      color: 'var(--text-tertiary)',
      fontSize: 13,
    }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
        {label}
      </div>
      Sin datos disponibles
    </div>
  );
}
