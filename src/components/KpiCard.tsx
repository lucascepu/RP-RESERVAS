import Link from 'next/link';
import styles from './KpiCard.module.css';

interface Props {
  label: string;
  value: string;
  unit: string;
  variacion: number;
  variacionPct: number;
  min12m: number;
  max12m: number;
  href: string;
  accentColor: string;
}

export default function KpiCard({
  label, value, unit, variacion, variacionPct,
  min12m, max12m, href, accentColor,
}: Props) {
  const ultimo = parseFloat(value.replace(/\./g, '').replace(',', '.'));
  const rango = max12m - min12m;
  const pct = rango > 0 ? Math.min(100, Math.max(2, Math.round(((ultimo - min12m) / rango) * 100))) : 50;
  const sube = variacion >= 0;

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.accent} style={{ background: accentColor }} />
      <div className={styles.label}>{label}</div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
      </div>
      <div className={`${styles.delta} ${sube ? styles.up : styles.down}`}>
        {sube ? '▲' : '▼'} {Math.abs(variacionPct).toFixed(1)}% vs rueda anterior
      </div>
      <div className={styles.barWrap}>
        <div className={styles.barLabels}>
          <span>{min12m.toLocaleString('es-AR')}</span>
          <span className={styles.barTitle}>rango 12m</span>
          <span>{max12m.toLocaleString('es-AR')}</span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%`, background: accentColor }} />
        </div>
      </div>
    </Link>
  );
}
