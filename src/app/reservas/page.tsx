import { getReservas } from '@/lib/data';
import { HITOS } from '@/lib/hitos';
import DetallePage from '@/components/DetallePage';

export const revalidate = 3600;

export default async function ReservasPage() {
  const data = await getReservas();
  const hitos = HITOS.filter(h => h.indicador === 'reservas' || h.indicador === 'global');

  return (
    <DetallePage
      titulo="Reservas Internacionales"
      subtitulo="BCRA · brutas · millones de USD"
      data={data}
      hitos={hitos}
      accentColor="var(--blue)"
      tipo="reservas"
      back="/"
    />
  );
}
