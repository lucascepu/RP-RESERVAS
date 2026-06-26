import { getCompras, calcularRegimen } from '@/lib/data';
import type { IndicadorSummary } from '@/lib/data';
import { HITOS } from '@/lib/hitos';
import DetallePage from '@/components/DetallePage';

export const revalidate = 3600;

export default async function ComprasPage() {
  const data = await getCompras();
  const hitos = HITOS.filter(h => h.indicador === 'compras' || h.indicador === 'global');

  const valores = data.serieCompras.map(d => d.valor);
  const summary: IndicadorSummary = {
    ultimo: data.hoy,
    fecha: data.fechaHoy,
    variacion: data.hoy,
    variacionPct: 0,
    min12m: valores.length ? Math.min(...valores) : 0,
    max12m: valores.length ? Math.max(...valores) : 0,
    ytd: data.acumAnio,
    mtd: data.acumMes,
    serie: data.serieCompras,
  };

  const regimen = calcularRegimen(data);

  return (
    <DetallePage
      titulo="Compras de Divisas BCRA"
      subtitulo="Intervención BCRA en el MULC · millones de USD"
      data={summary}
      hitos={hitos}
      accentColor="var(--green)"
      tipo="compras"
      back="/"
      mulcData={{
        pctHoy: data.pctMulcHoy,
        volHoy: data.volMulcHoy,
        acum5ruedas: data.acum5ruedas,
        vol5ruedas: data.vol5ruedas,
        prom5ruedas: data.prom5ruedas,
        pctPromedio5: data.pctPromedio5ruedas,
        acumAnio: data.acumAnio,
        seriePct: data.seriePct,
      }}
      regimen={regimen}
    />
  );
}
