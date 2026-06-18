'use client';

import { useState } from 'react';

export default function TestMaeClient() {
  const [resultado, setResultado] = useState<string>('');
  const [cargando, setCargando] = useState(false);

  const probar = async () => {
    setCargando(true);
    try {
      const res = await fetch('https://api.mae.com.ar/MarketData/v1/mercado/cotizaciones/forex', {
        headers: {
          'x-api-key': 'nuDX73vj2483KSUgvenkj9t50oA0vgvA4WcuRAER',
        },
      });
      const status = res.status;
      const text = await res.text();
      setResultado(`STATUS: ${status}\n\n${text.slice(0, 2000)}`);
    } catch (e) {
      setResultado(`ERROR: ${String(e)}`);
    }
    setCargando(false);
  };

  return (
    <div style={{ padding: 20, color: 'white', background: '#0d1117', minHeight: '100vh' }}>
      <button onClick={probar} disabled={cargando} style={{ padding: 10, marginBottom: 20 }}>
        {cargando ? 'Probando...' : 'Probar API MAE desde el navegador'}
      </button>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{resultado}</pre>
    </div>
  );
}
