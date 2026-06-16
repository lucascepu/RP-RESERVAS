import Link from 'next/link';
import styles from './KpiCard.module.css';

interface Props {
  label: string;
  value: string;
  unit: string;
  variacion?: number;
  variacionPct?: number;
  href: string;
  accentColor: string;
  invertLogic?: boolean;
  subInfo?: string;
  subInfo2?: string;
  hideVariacion?: boolean;
  badge?: string;
}

export default function KpiCard({
  label, value, unit, variacion = 0, variacionPct = 0,
  href, accentColor, invertLogic = false,
  subInfo, subInfo2, hideVariacion = false, badge,
}: Props) {
  const sube = variacion >= 0;
  const esBueno = invertLogic ? !sube : sube;
  const deltaColor = esBueno ? 'var(--green)' : 'var(--red)';
  const variacionAbs = Math.abs(variacion);
  const variacionFmt = variacionAbs % 1 === 0
    ? variacionAbs.toLocaleString('es-AR')
    : variacionAbs.toFixed(1);

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.accent} style={{ background: accentColor }} />
      <div className={styles.labelRow}>
        <div className={styles.label}>{label}</div>
        {badge && <div className={styles.badge}>{badge}</div>}
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
        {!hideVariacion && (
          <span className={styles.inlineDelta} style={{ color: deltaColor }}>
            {sube ? '▲' : '▼'} {variacionFmt}
          </span>
        )}
      </div>

      {!hideVariacion && (
        <div className={styles.pctRow} style={{ color: deltaColor }}>
          {sube ? '▲' : '▼'} {Math.abs(variacionPct).toFixed(1)}% vs rueda anterior
        </div>
      )}

      {subInfo && (
        <div className={styles.subInfo}>{subInfo}</div>
      )}
      {subInfo2 && (
        <div className={styles.subInfo2}>{subInfo2}</div>
      )}
    </Link>
  );
}
