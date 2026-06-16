export type HitoTag = 'deuda' | 'politico' | 'macro' | 'bcra';
export type HitoIndicador = 'riesgo-pais' | 'reservas' | 'compras' | 'global';

export interface Hito {
  id: string;
  fecha: string;
  titulo: string;
  descripcion?: string;
  tag: HitoTag;
  indicador: HitoIndicador;
  fuente?: string;
  automatico?: boolean;
}

export const HITOS: Hito[] = [
  {
    id: 'rp-minimo-8-anos',
    fecha: '2026-06-15',
    titulo: 'Riesgo País toca mínimo desde abril 2018',
    descripcion: 'El EMBI Argentina cierra en 425 pbs, mínimo en 8 años. Impulsado por el upgrade de S&P a B− del 9/6 y el contexto global favorable (acuerdo EEUU-Irán). Última vez en este nivel: 27 de abril de 2018.',
    tag: 'deuda',
    indicador: 'riesgo-pais',
    fuente: 'JP Morgan / Ámbito',
  },
  {
    id: 'sp-upgrade-b-minus',
    fecha: '2026-06-09',
    titulo: 'S&P sube calificación de deuda argentina a B−',
    descripcion: 'Standard & Poor\'s eleva la nota soberana de CCC+ a B−, reflejando la mejora en el perfil crediticio tras el acuerdo con el FMI y la acumulación de reservas.',
    tag: 'deuda',
    indicador: 'riesgo-pais',
    fuente: 'S&P Global Ratings',
    automatico: false,
  },
  {
    id: 'bcra-meta-2026',
    fecha: '2026-06-10',
    titulo: 'BCRA supera meta anual de acumulación de reservas',
    descripcion: 'Las compras netas acumuladas en 2026 alcanzan los USD 10.419 MM, superando el piso de la meta anual fijada en USD 10.000 MM.',
    tag: 'bcra',
    indicador: 'compras',
    fuente: 'BCRA / Ámbito',
    automatico: false,
  },
  {
    id: 'fmi-desembolso-mayo',
    fecha: '2026-05-14',
    titulo: 'FMI confirma nuevo desembolso para Argentina',
    descripcion: 'El directorio del FMI aprueba la revisión del programa y habilita un nuevo tramo de desembolso, reforzando la posición de reservas.',
    tag: 'macro',
    indicador: 'reservas',
    fuente: 'FMI',
    automatico: false,
  },
  {
    id: 'banda-cambiaria-inicio',
    fecha: '2026-01-10',
    titulo: 'BCRA lanza nuevo esquema de banda cambiaria',
    descripcion: 'El Banco Central implementa una banda de flotación administrada e inicia el programa de compras de divisas con meta anual de USD 10.000 MM.',
    tag: 'bcra',
    indicador: 'global',
    fuente: 'BCRA',
    automatico: false,
  },
];

export const TAG_LABELS: Record<HitoTag, string> = {
  deuda: 'Deuda',
  politico: 'Político',
  macro: 'Macro',
  bcra: 'BCRA',
};

export const INDICADOR_LABELS: Record<HitoIndicador, string> = {
  'riesgo-pais': 'Riesgo País',
  reservas: 'Reservas',
  compras: 'Compras',
  global: 'General',
};

export const UMBRALES = {
  'riesgo-pais': { pct: 8 },
  reservas: { pct: 3 },
  compras: { pct: 50 },
};
