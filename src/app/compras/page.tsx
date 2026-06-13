import { getCompras } from '@/lib/data';
import { HITOS } from '@/lib/hitos';
import DetallePage from '@/components/DetallePage';

export const revalidate = 3600;

export default async function ComprasPage() {
  const data = await getCompras();
  const hitos = HITOS.filter(h => h.indicador === 'compras' || h.indicador === 'global');

  return (
    <DetallePage
      titulo="Compras de Divisas"
      subtitulo="BCRA · posición neta diaria · millones de USD"
      data={data}
      hitos={hitos}
      accentColor="var(--green)"
      tipo="compras"
      back="/"
    />
  );
}
