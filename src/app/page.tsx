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
          <p className={styles.sub}>Riesgo País · Reservas BCRA · Compras de divisas</p>
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
            accentColor="var(--red)"
          />
        ) : <CardError label="Riesgo País" />}

        {resData ? (
          <KpiCard
            label="Reservas Brutas"
            value={(resData.ultimo / 1000).toFixed(1)}
            unit="USD MM"
            variacion={resData.variacion}
            variacionPct={resData.variacionPct}
            min12m={Math.round(resData.min12m / 1000)}
            max12m={Math.round(resData.max12m / 1000)}
            href="/reservas"
            accentColor="var(--accent)"
          />
        ) : <CardError label="Reservas" />}

        {compData ? (
          <KpiCard
            label="Compras BCRA"
            value={compData.ultimo.toLocaleString('es-AR')}
            unit="USD MM"
            variacion={compData.variacion}
            variacionPct={compData.variacionPct}
            min12m={compData.min12m}
            max12m={compData.max12m}
            href="/compras"
            accentColor="var(--green)"
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
