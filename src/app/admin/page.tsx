'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

type Ultimo = { f: string; v: number } | null;
type Estado = 'idle' | 'ok' | 'error';

export default function AdminPage() {
  const router = useRouter();
  const hoy = new Date().toISOString().slice(0, 10);
  const [pin, setPin] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [pinError, setPinError] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const [fecha, setFecha] = useState(hoy);
  const [reservas, setReservas] = useState('');
  const [compraValor, setCompraValor] = useState('');
  const [signo, setSigno] = useState<'compra' | 'venta'>('compra');
  const [rp, setRp] = useState('');
  const [mulc, setMulc] = useState('');

  const [ultimos, setUltimos] = useState<{
    reservas: Ultimo; compras: Ultimo; rp: Ultimo; mulc: Ultimo;
  }>({ reservas: null, compras: null, rp: null, mulc: null });

  const [estado, setEstado] = useState<Estado>('idle');
  const [guardados, setGuardados] = useState<string[]>([]);

  useEffect(() => {
    if (!autenticado) return;
    Promise.all([
      fetch('/api/reservas').then(r => r.json()),
      fetch('/api/compras').then(r => r.json()),
      fetch('/api/riesgo-pais').then(r => r.json()),
      fetch('/api/mulc').then(r => r.json()),
    ]).then(([res, comp, rp, mulc]) => {
      setUltimos({ reservas: res.ultimo, compras: comp.ultimo, rp: rp.ultimo, mulc: mulc.ultimo });
    });
  }, [autenticado]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1245') { setAutenticado(true); setPinError(false); }
    else { setPinError(true); setPin(''); }
  };

  const handleGuardarTodo = async () => {
    setEstado('idle');
    setGuardados([]);

    const post = async (url: string, valor: number, label: string): Promise<string | null> => {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, fecha, valor }) });
        return r.ok ? label : null;
      } catch { return null; }
    };

    const ok: string[] = [];

    if (reservas) {
      const v = parseFloat(reservas.replace(',', '.'));
      if (!isNaN(v)) { const r = await post('/api/reservas', v, 'Reservas'); if (r) ok.push(r); }
    }

    if (compraValor) {
      const v = parseFloat(compraValor.replace(',', '.'));
      if (!isNaN(v)) {
        const valorFinal = signo === 'venta' ? -Math.abs(v) : Math.abs(v);
        const r = await post('/api/compras', valorFinal, 'Compras');
        if (r) ok.push(r);
      }
    }

    if (rp) {
      const v = parseFloat(rp.replace(',', '.'));
      if (!isNaN(v)) { const r = await post('/api/riesgo-pais', v, 'Riesgo País'); if (r) ok.push(r); }
    }

    if (mulc) {
      const v = parseFloat(mulc.replace(',', '.'));
      if (!isNaN(v)) { const r = await post('/api/mulc', v, 'MULC'); if (r) ok.push(r); }
    }

    const errores = [reservas, compraValor, rp, mulc].filter(Boolean).length - ok.length;

    if (errores > 0) { setEstado('error'); }
    else if (ok.length > 0) { setEstado('ok'); }

    setGuardados(ok);
    if (ok.length > 0) {
      setReservas(''); setCompraValor(''); setRp(''); setMulc('');
      // Refrescar últimos
      Promise.all([
        fetch('/api/reservas').then(r => r.json()),
        fetch('/api/compras').then(r => r.json()),
        fetch('/api/riesgo-pais').then(r => r.json()),
        fetch('/api/mulc').then(r => r.json()),
      ]).then(([res, comp, rp, mulc]) => {
        setUltimos({ reservas: res.ultimo, compras: comp.ultimo, rp: rp.ultimo, mulc: mulc.ultimo });
      });
    }
    setTimeout(() => { setEstado('idle'); setGuardados([]); }, 4000);
  };

  const hayAlgo = reservas || compraValor || rp || mulc;

  if (!autenticado) {
    return (
      <main className={styles.main}>
        <form className={styles.pinBox} onSubmit={handlePinSubmit}>
          <div className={styles.titulo}>Admin</div>
          <div className={styles.subtitulo}>Ingresá tu PIN para continuar</div>
          <input
            ref={pinInputRef}
            type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoFocus
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/[^0-9]/g, '')); setPinError(false); }}
            className={styles.pinInput} placeholder="• • • •"
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

        {/* Fila compacta */}
        <div className={styles.filaCompacta}>

          {/* Fecha */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>Fecha</label>
            <input type="date" value={fecha} max={hoy}
              onChange={e => setFecha(e.target.value)} className={styles.input} />
          </div>

          {/* Reservas */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>
              Reservas <span className={styles.campoUlt}>{ultimos.reservas ? `últ: ${ultimos.reservas.v.toLocaleString('es-AR')}` : ''}</span>
            </label>
            <input type="number" placeholder="MM" value={reservas}
              onChange={e => setReservas(e.target.value)} className={styles.input} />
          </div>

          {/* Compras */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>
              Compras <span className={styles.campoUlt}>{ultimos.compras ? `últ: ${ultimos.compras.v > 0 ? '+' : ''}${ultimos.compras.v}` : ''}</span>
            </label>
            <div className={styles.compraRow}>
              <div className={styles.signoMini}>
                <button className={`${styles.signoBtnMini} ${signo === 'compra' ? styles.compra : ''}`}
                  onClick={() => setSigno('compra')}>▲</button>
                <button className={`${styles.signoBtnMini} ${signo === 'venta' ? styles.venta : ''}`}
                  onClick={() => setSigno('venta')}>▼</button>
              </div>
              <input type="number" placeholder="MM" value={compraValor}
                onChange={e => setCompraValor(e.target.value)} className={styles.input} />
            </div>
          </div>

          {/* Riesgo País */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>
              Riesgo País <span className={styles.campoUlt}>{ultimos.rp ? `últ: ${ultimos.rp.v}` : ''}</span>
            </label>
            <input type="number" placeholder="pbs" value={rp}
              onChange={e => setRp(e.target.value)} className={styles.input} />
          </div>

          {/* MULC */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>
              Vol. MULC <span className={styles.campoUlt}>{ultimos.mulc ? `últ: ${ultimos.mulc.v}` : ''}</span>
            </label>
            <input type="number" placeholder="MM" value={mulc}
              onChange={e => setMulc(e.target.value)} className={styles.input} />
          </div>

          {/* Botón */}
          <div className={styles.campo}>
            <label className={styles.campoLabel}>&nbsp;</label>
            <button className={styles.guardar} onClick={handleGuardarTodo} disabled={!hayAlgo}>
              Guardar todo
            </button>
          </div>

        </div>

        {/* Feedback */}
        {estado === 'ok' && guardados.length > 0 && (
          <div className={styles.feedback}>
            ✓ Guardado: {guardados.join(' · ')}
          </div>
        )}
        {estado === 'error' && (
          <div className={styles.feedbackError}>Error al guardar. Intentá de nuevo.</div>
        )}

        {/* Hint MULC */}
        <div className={styles.hint}>
          Vol. MULC: sumar <strong>USMEP + UST$T + USB$T</strong> en MAE Mayorista
        </div>

      </div>
    </main>
  );
}
