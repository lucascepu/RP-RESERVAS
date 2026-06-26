'use client';

import type { RegimenEstado } from '@/lib/data';
import styles from './RegimenPanel.module.css';

const TONO_CONFIG = {
  comprador:  { label: 'Comprador activo',  icon: '▲', cls: 'tonoGreen'   },
  moderado:   { label: 'Moderado',          icon: '◆', cls: 'tonoYellow'  },
  cauteloso:  { label: 'Cauteloso',         icon: '▼', cls: 'tonoNeutral' },
  vendedor:   { label: 'Vendedor neto',     icon: '▼', cls: 'tonoRed'     },
};

const COLOR_DOT: Record<string, string> = {
  green:   'var(--green)',
  yellow:  '#d29922',
  red:     'var(--red)',
  neutral: 'var(--text-tertiary)',
};

export default function RegimenPanel({ estado }: { estado: RegimenEstado }) {
  const tono = TONO_CONFIG[estado.tono];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titulo}>Estado del régimen cambiario</div>
        <div className={`${styles.tono} ${styles[tono.cls]}`}>
          <span className={styles.tonoIcon}>{tono.icon}</span>
          {tono.label}
        </div>
      </div>

      <div className={styles.resumen}>{estado.resumen}</div>

      <div className={styles.signals}>
        {estado.signals.map((s, i) => (
          <div key={i} className={styles.signal}>
            <div className={styles.signalDot} style={{ background: COLOR_DOT[s.color] }} />
            <div className={styles.signalContent}>
              <div className={styles.signalLabel}>{s.label}</div>
              <div className={styles.signalValor} style={{ color: COLOR_DOT[s.color] }}>
                {s.valor}
              </div>
              <div className={styles.signalDesc}>{s.descripcion}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
