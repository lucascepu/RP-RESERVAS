import Link from 'next/link';
import { HITOS, TAG_LABELS, type Hito } from '@/lib/hitos';
import styles from './HitosPanel.module.css';

const TAG_COLORS: Record<string, string> = {
  deuda: '#58a6ff',
  politico: '#d29922',
  macro: '#8b949e',
  bcra: '#3fb950',
};

const INDICADOR_HREF: Record<string, string> = {
  'riesgo-pais': '/riesgo-pais',
  reservas: '/reservas',
  compras: '/compras',
  global: '/',
};

function formatFecha(iso: string) {
  const [y, m, d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

export default function HitosPanel() {
  const sorted = [...HITOS].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Últimas noticias</span>
        <span className={styles.subtitle}>hitos económicos y políticos</span>
      </div>
      <div className={styles.list}>
        {sorted.map((h: Hito) => (
          <Link key={h.id} href={INDICADOR_HREF[h.indicador]} className={styles.item}>
            <div className={styles.itemLeft}>
              <div className={styles.dot} style={{ background: TAG_COLORS[h.tag] }} />
            </div>
            <div className={styles.itemBody}>
              <div className={styles.itemMeta}>
                <span
                  className={styles.tag}
                  style={{ color: TAG_COLORS[h.tag], borderColor: TAG_COLORS[h.tag] + '44' }}
                >
                  {TAG_LABELS[h.tag]}
                </span>
                <span className={styles.fecha}>{formatFecha(h.fecha)}</span>
                {h.automatico && <span className={styles.auto}>auto</span>}
              </div>
              <div className={styles.itemTitle}>{h.titulo}</div>
              {h.descripcion && (
                <div className={styles.itemDesc}>{h.descripcion}</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
