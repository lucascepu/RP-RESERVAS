import { getRiesgoPais } from '@/lib/data';
import { HITOS } from '@/lib/hitos';
import DetallePage from '@/components/DetallePage';

export const dynamic = 'force-dynamic';

export default async function RiesgoPaisPage() {
  const data = await getRiesgoPais();
  const hitos = HITOS.filter(h => h.indicador === 'riesgo-pais' || h.indicador === 'global');

  return (
    <DetallePage
      titulo="Riesgo País"
      subtitulo="EMBI · JP Morgan · puntos básicos"
      data={data}
      hitos={hitos}
      accentColor="var(--text-secondary)"
      tipo="riesgo-pais"
      back="/"
    />
  );
}
