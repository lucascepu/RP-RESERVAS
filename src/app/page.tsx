import { getReservas, getRiesgoPais, getCompras } from '@/lib/data';
import KpiCard from '@/components/KpiCard';
import HitosPanel from '@/components/HitosPanel';
import styles from './page.module.css';

export const revalidate = 3600;

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
            min12m={rpData.min12m}
            max12m={rpData.max12m}
            href="/riesgo-pais"
            accentColor="#a78bfa"
            invertLogic={true}
            showRange={true}
          />
        ) : <CardError label="Riesgo País" />}

        {resData ? (
          <KpiCard
            label="Reservas Brutas"
            value={(resData.ultimo / 1000).toFixed(1)}
            unit="USD MM"
            variacion={Math.round(resData.variacion / 1000 * 10) / 10}
            variacionPct={resData.variacionPct}
            href="/reservas"
            accentColor="var(--accent)"
            showRange={false}
          />
        ) : <CardError label="Reservas" />}

        {compData ? (
          <KpiCard
            label="Compras BCRA"
            value={compData.hoy >= 0 ? '+' + compData.hoy.toLocaleString('es-AR') : compData.hoy.toLocaleString('es-AR')}
            unit="USD MM hoy"
            variacion={compData.hoy}
            variacionPct={0}
            href="/compras"
            accentColor="var(--green)"
            showRange={false}
            subInfo={`Junio: +${compData.acumMes.toLocaleString('es-AR')} MM · 2026: +${compData.acumAnio.toLocaleString('es-AR')} MM`}
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
