import { getCompras } from '@/lib/data';
import type { IndicadorSummary } from '@/lib/data';
import { HITOS } from '@/lib/hitos';
import DetallePage from '@/components/DetallePage';

export const revalidate = 3600;

export default async function ComprasPage() {
  const data = await getCompras();
  const hitos = HITOS.filter(h => h.indicador === 'compras' || h.indicador === 'global');

  const valores = data.serie.map(d => d.valor);
  const summary: IndicadorSummary = {
    ultimo: data.hoy,
    fecha: data.fechaHoy,
    variacion: data.hoy,
    variacionPct: 0,
    min12m: Math.min(...valores),
    max12m: Math.max(...valores),
    serie: data.serie,
  };

  return (
    <DetallePage
      titulo="Compras de Divisas"
      subtitulo="BCRA · compra neta diaria · millones de USD"
      data={summary}
      hitos={hitos}
      accentColor="var(--green)"
      tipo="compras"
      back="/"
    />
  );
}
