'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminPage() {
  const router = useRouter();
  const hoy = new Date().toISOString().slice(0, 10);
  const [pin, setPin] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [pinError, setPinError] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const [fecha, setFecha] = useState(hoy);

  const [reservas, setReservas] = useState('');
  const [reservasUltimo, setReservasUltimo] = useState<{ f: string; v: number } | null>(null);
  const [reservasEstado, setReservasEstado] = useState<'idle' | 'ok' | 'error'>('idle');

  const [compraValor, setCompraValor] = useState('');
  const [signo, setSigno] = useState<'compra' | 'venta'>('compra');
  const [comprasUltimo, setComprasUltimo] = useState<{ f: string; v: number } | null>(null);
  const [comprasEstado, setComprasEstado] = useState<'idle' | 'ok' | 'error'>('idle');

  const [rp, setRp] = useState('');
  const [rpUltimo, setRpUltimo] = useState<{ f: string; v: number } | null>(null);
  const [rpEstado, setRpEstado] = useState<'idle' | 'ok' | 'error'>('idle');

  const [mulc, setMulc] = useState('');
  const [mulcUltimo, setMulcUltimo] = useState<{ f: string; v: number } | null>(null);
  const [mulcEstado, setMulcEstado] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    if (autenticado) {
      fetch('/api/reservas').then(r => r.json()).then(d => setReservasUltimo(d.ultimo));
      fetch('/api/compras').then(r => r.json()).then(d => setComprasUltimo(d.ultimo));
      fetch('/api/riesgo-pais').then(r => r.json()).then(d => setRpUltimo(d.ultimo));
      fetch('/api/mulc').then(r => r.json()).then(d => setMulcUltimo(d.ultimo));
    }
  }, [autenticado]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1245') {
      setAutenticado(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const handleGuardarReservas = async () => {
    const monto = parseFloat(reservas.replace(',', '.'));
    if (!reservas || isNaN(monto)) return;
    const res = await fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, fecha, valor: monto }),
    });
    if (res.ok) {
      const d = await res.json();
      setReservasEstado('ok');
      setReservasUltimo(d.ultimo);
      setReservas('');
      setTimeout(() => setReservasEstado('idle'), 3000);
    } else {
      setReservasEstado('error');
    }
  };

  const handleGuardarCompras = async () => {
    const monto = parseFloat(compraValor.replace(',', '.'));
    if (!compraValor || isNaN(monto)) return;
    const valorFinal = signo === 'venta' ? -Math.abs(monto) : Math.abs(monto);
    const res = await fetch('/api/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, fecha, valor: valorFinal }),
    });
    if (res.ok) {
      const d = await res.json();
      setComprasEstado('ok');
      setComprasUltimo(d.ultimo);
      setCompraValor('');
      setTimeout(() => setComprasEstado('idle'), 3000);
    } else {
      setComprasEstado('error');
    }
  };

  const handleGuardarRP = async () => {
    const valor = parseFloat(rp.replace(',', '.'));
    if (!rp || isNaN(valor)) return;
    const res = await fetch('/api/riesgo-pais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, fecha, valor }),
    });
    if (res.ok) {
      const d = await res.json();
      setRpEstado('ok');
      setRpUltimo(d.ultimo);
      setRp('');
      setTimeout(() => setRpEstado('idle'), 3000);
    } else {
      setRpEstado('error');
    }
  };

  const handleGuardarMulc = async () => {
    const valor = parseFloat(mulc.replace(',', '.'));
    if (!mulc || isNaN(valor)) return;
    const res = await fetch('/api/mulc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, fecha, valor }),
    });
    if (res.ok) {
      const d = await res.json();
      setMulcEstado('ok');
      setMulcUltimo(d.ultimo);
      setMulc('');
      setTimeout(() => setMulcEstado('idle'), 3000);
    } else {
      setMulcEstado('error');
    }
  };

  if (!autenticado) {
    return (
      <main className={styles.main}>
        <form className={styles.pinBox} onSubmit={handlePinSubmit}>
          <div className={styles.titulo}>Admin</div>
          <div className={styles.subtitulo}>Ingresá tu PIN para continuar</div>
          <input
            ref={pinInputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={e => {
              setPin(e.target.value.replace(/[^0-9]/g, ''));
              setPinError(false);
            }}
            className={styles.pinInput}
            placeholder="• • • •"
          />
          {pinError && <div className={styles.error}>PIN incorrecto</div>}
          <button type="submit" className={styles.guardar}>Ingresar</button>
        </form>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.wrapper}>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${styles.tabActivo}`}>Carga</button>
          <button className={styles.tab} onClick={() => router.push('/export')}>Exportar</button>
        </div>

        {/* Fecha global — arriba, ancho completo */}
        <div className={styles.fechaGlobal}>
          <label>Fecha</label>
          <input
            type="date"
            value={fecha}
            max={hoy}
            onChange={e => setFecha(e.target.value)}
            className={styles.input}
          />
        </div>

        {/* Grid 2×2 */}
        <div className={styles.grid}>

          {/* Reservas */}
          <div className={styles.card}>
            <div className={styles.cardTitulo}>📊 Reservas BCRA</div>
            {reservasUltimo && (
              <div className={styles.ultimoBox}>
                Último: <strong>{reservasUltimo.f}</strong> → {reservasUltimo.v.toLocaleString('es-AR')} MM
              </div>
            )}
            <div className={styles.field}>
              <label>Monto total (USD MM)</label>
              <input
                type="number"
                placeholder="ej: 47655"
                value={reservas}
                onChange={e => setReservas(e.target.value)}
                className={styles.input}
              />
            </div>
            <button className={styles.guardar} onClick={handleGuardarReservas} disabled={!reservas}>
              Guardar
            </button>
            {reservasEstado === 'ok' && <div className={styles.ok}>✓ Guardado</div>}
            {reservasEstado === 'error' && <div className={styles.error}>Error</div>}
          </div>

          {/* Compras */}
          <div className={styles.card}>
            <div className={styles.cardTitulo}>💱 Compra/Venta</div>
            {comprasUltimo && (
              <div className={styles.ultimoBox}>
                Último: <strong>{comprasUltimo.f}</strong> → {comprasUltimo.v > 0 ? '+' : ''}{comprasUltimo.v} MM
              </div>
            )}
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
                value={compraValor}
                onChange={e => setCompraValor(e.target.value)}
                className={styles.input}
              />
            </div>
            <button className={styles.guardar} onClick={handleGuardarCompras} disabled={!compraValor}>
              Guardar {signo === 'compra' ? 'Compra' : 'Venta'}
            </button>
            {comprasEstado === 'ok' && <div className={styles.ok}>✓ Guardado</div>}
            {comprasEstado === 'error' && <div className={styles.error}>Error</div>}
          </div>

          {/* Riesgo País */}
          <div className={styles.card}>
            <div className={styles.cardTitulo}>📉 Riesgo País</div>
            {rpUltimo && (
              <div className={styles.ultimoBox}>
                Último: <strong>{rpUltimo.f}</strong> → {rpUltimo.v.toLocaleString('es-AR')} pbs
              </div>
            )}
            <div className={styles.field}>
              <label>Puntos básicos (pbs)</label>
              <input
                type="number"
                placeholder="ej: 421"
                value={rp}
                onChange={e => setRp(e.target.value)}
                className={styles.input}
              />
            </div>
            <button className={styles.guardar} onClick={handleGuardarRP} disabled={!rp}>
              Guardar
            </button>
            {rpEstado === 'ok' && <div className={styles.ok}>✓ Guardado</div>}
            {rpEstado === 'error' && <div className={styles.error}>Error</div>}
          </div>

          {/* MULC */}
          <div className={styles.card}>
            <div className={styles.cardTitulo}>📈 Vol. MULC</div>
            {mulcUltimo && (
              <div className={styles.ultimoBox}>
                Último: <strong>{mulcUltimo.f}</strong> → {mulcUltimo.v.toLocaleString('es-AR')} MM
              </div>
            )}
            <div className={styles.field}>
              <label>Volumen operado (USD MM)</label>
              <input
                type="number"
                placeholder="ej: 574"
                value={mulc}
                onChange={e => setMulc(e.target.value)}
                className={styles.input}
              />
            </div>
            <button className={styles.guardar} onClick={handleGuardarMulc} disabled={!mulc}>
              Guardar
            </button>
            {mulcEstado === 'ok' && <div className={styles.ok}>✓ Guardado</div>}
            {mulcEstado === 'error' && <div className={styles.error}>Error</div>}
          </div>

        </div>
      </div>
    </main>
  );
}
