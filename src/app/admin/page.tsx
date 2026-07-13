'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

type Ultimo = { f: string; v: number } | null;
type Estado = 'idle' | 'loading' | 'ok' | 'error';

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
  const [errores, setErrores] = useState<string[]>([]);

  const fetchUltimos = () => {
    Promise.all([
      fetch('/api/reservas').then(r => r.json()),
      fetch('/api/compras').then(r => r.json()),
      fetch('/api/riesgo-pais').then(r => r.json()),
      fetch('/api/mulc').then(r => r.json()),
    ]).then(([res, comp, rp, mulc]) => {
      setUltimos({ reservas: res.ultimo, compras: comp.ultimo, rp: rp.ultimo, mulc: mulc.ultimo });
    });
  };

  useEffect(() => { if (autenticado) fetchUltimos(); }, [autenticado]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1245') { setAutenticado(true); setPinError(false); }
    else { setPinError(true); setPin(''); }
  };

  const handleGuardarTodo = async () => {
    const hayAlgo = reservas || compraValor || rp || mulc;
    if (!hayAlgo) return;

    setEstado('loading');
    setGuardados([]);
    setErrores([]);

    const comprasValor = compraValor
      ? (signo === 'venta' ? -Math.abs(parseFloat(compraValor)) : Math.abs(parseFloat(compraValor)))
      : undefined;

    const body: Record<string, unknown> = { pin, fecha };
    if (reservas)    body.reservas = parseFloat(reservas.replace(',', '.'));
    if (compraValor) body.compras  = comprasValor;
    if (rp)          body.rp       = parseFloat(rp.replace(',', '.'));
    if (mulc)        body.mulc     = parseFloat(mulc.replace(',', '.'));

    try {
      const res = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setEstado('error');
        setErrores(['Error de servidor']);
        return;
      }

      setGuardados(data.ok ?? []);
      setErrores(data.errores ?? []);
      setEstado(data.errores?.length > 0 ? 'error' : 'ok');

      if ((data.ok ?? []).length > 0) {
        setReservas(''); setCompraValor(''); setRp(''); setMulc('');
        fetchUltimos();
      }
    } catch {
      setEstado('error');
      setErrores(['Error de conexión']);
    }

    setTimeout(() => { setEstado('idle'); setGuardados([]); setErrores([]); }, 5000);
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

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${styles.tabActivo}`}>Carga</button>
          <button className={styles.tab} onClick={() => router.push('/export')}>Exportar</button>
        </div>

        <div className={styles.filaCompacta}>

          <div className={styles.campo}>
            <label className={styles.campoLabel}>Fecha</label>
            <input type="date" value={fecha} max={hoy}
              onChange={e => setFecha(e.target.value)} className={styles.input} />
          </div>

          <div className={styles.campo}>
            <label className={styles.campoLabel}>
              Reservas <span className={styles.campoUlt}>{ultimos.reservas ? `últ: ${ultimos.reservas.v.toLocaleString('es-AR')}` : ''}</span>
            </label>
            <input type="number" placeholder="MM" value={reservas}
              onChange={e => setReservas(e.target.value)} className={styles.input} />
          </div>

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

          <div className={styles.campo}>
            <label className={styles.campoLabel}>
              Riesgo País <span className={styles.campoUlt}>{ultimos.rp ? `últ: ${ultimos.rp.v}` : ''}</span>
            </label>
            <input type="number" placeholder="pbs" value={rp}
              onChange={e => setRp(e.target.value)} className={styles.input} />
          </div>

          <div className={styles.campo}>
            <label className={styles.campoLabel}>
              Vol. MULC <span className={styles.campoUlt}>{ultimos.mulc ? `últ: ${ultimos.mulc.v}` : ''}</span>
            </label>
            <input type="number" placeholder="MM" value={mulc}
              onChange={e => setMulc(e.target.value)} className={styles.input} />
          </div>

          <div className={styles.campo}>
            <label className={styles.campoLabel}>&nbsp;</label>
            <button
              className={styles.guardar}
              onClick={handleGuardarTodo}
              disabled={!hayAlgo || estado === 'loading'}>
              {estado === 'loading' ? 'Guardando...' : 'Guardar todo'}
            </button>
          </div>

        </div>

        {estado === 'ok' && guardados.length > 0 && (
          <div className={styles.feedback}>
            ✓ Guardado: {guardados.join(' · ')}
          </div>
        )}
        {estado === 'error' && (
          <div className={styles.feedbackError}>
            Error al guardar: {errores.join(', ')}
          </div>
        )}

        <div className={styles.hint}>
          Vol. MULC: sumar <strong>USMEP + UST$T + USB$T</strong> en MAE Mayorista
        </div>

      </div>
    </main>
  );
}
