'use client';

import { useState } from 'react';
import styles from './admin.module.css';

export default function AdminPage() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [pin, setPin] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [valor, setValor] = useState('');
  const [signo, setSigno] = useState<'compra' | 'venta'>('compra');
  const [estado, setEstado] = useState<'idle' | 'ok' | 'error'>('idle');
  const [ultimo, setUltimo] = useState<{ f: string; v: number } | null>(null);

  const handlePin = () => {
    if (pin === '1245') {
      setAutenticado(true);
      setPinError(false);
      // Cargar ultimo dato
      fetch('/api/compras').then(r => r.json()).then(d => setUltimo(d.ultimo));
    } else {
      setPinError(true);
    }
  };

  const handleGuardar = async () => {
    const monto = parseFloat(valor.replace(',', '.'));
    if (!valor || isNaN(monto)) return;
    const valorFinal = signo === 'venta' ? -Math.abs(monto) : Math.abs(monto);

    const res = await fetch('/api/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, fecha, valor: valorFinal }),
    });

    if (res.ok) {
      const d = await res.json();
      setEstado('ok');
      setUltimo(d.ultimo);
      setValor('');
      setTimeout(() => setEstado('idle'), 3000);
    } else {
      setEstado('error');
    }
  };

  if (!autenticado) {
    return (
      <main className={styles.main}>
        <div className={styles.pinBox}>
          <div className={styles.titulo}>Admin</div>
          <div className={styles.subtitulo}>Ingresá tu PIN para continuar</div>
          <div className={styles.pinRow}>
            {[0,1,2,3].map(i => (
              <div key={i} className={`${styles.pinDot} ${pin.length > i ? styles.filled : ''}`} />
            ))}
          </div>
          <div className={styles.numpad}>
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
              <button
                key={i}
                className={`${styles.numBtn} ${n === '' ? styles.hidden : ''}`}
                onClick={() => {
                  if (n === '⌫') setPin(p => p.slice(0,-1));
                  else if (pin.length < 4) {
                    const nuevo = pin + n;
                    setPin(nuevo);
                    if (nuevo.length === 4) {
                      setTimeout(() => {
                        if (nuevo === '1245') {
                          setAutenticado(true);
                          fetch('/api/compras').then(r => r.json()).then(d => setUltimo(d.ultimo));
                        } else {
                          setPinError(true);
                          setPin('');
                        }
                      }, 200);
                    }
                  }
                }}
              >
                {n}
              </button>
            ))}
          </div>
          {pinError && <div className={styles.error}>PIN incorrecto</div>}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.titulo}>Cargar compra BCRA</div>

        {ultimo && (
          <div className={styles.ultimoBox}>
            Último dato: <strong>{ultimo.f}</strong> → {ultimo.v > 0 ? '+' : ''}{ultimo.v} MM
          </div>
        )}

        <div className={styles.field}>
          <label>Fecha</label>
          <input
            type="date"
            value={fecha}
            max={hoy}
            onChange={e => setFecha(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label>Tipo</label>
          <div className={styles.signoRow}>
            <button
              className={`${styles.signoBtn} ${signo === 'compra' ? styles.compra : ''}`}
              onClick={() => setSigno('compra')}
            >
              ▲ Compra
            </button>
            <button
              className={`${styles.signoBtn} ${signo === 'venta' ? styles.venta : ''}`}
              onClick={() => setSigno('venta')}
            >
              ▼ Venta
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label>Monto (USD MM)</label>
          <input
            type="number"
            placeholder="ej: 121"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className={styles.input}
          />
        </div>

        <button
          className={styles.guardar}
          onClick={handleGuardar}
          disabled={!valor}
        >
          Guardar
        </button>

        {estado === 'ok' && <div className={styles.ok}>✓ Guardado correctamente</div>}
        {estado === 'error' && <div className={styles.error}>Error al guardar</div>}
      </div>
    </main>
  );
}
