# RP + Reservas

Seguimiento de **Riesgo País**, **Reservas del BCRA** y **Compras de divisas** — Argentina.

## Stack

- [Next.js 15](https://nextjs.org/) — App Router
- [Recharts](https://recharts.org/) — gráficos
- Deploy en [Vercel](https://vercel.com/)

## Fuentes de datos

| Indicador | Fuente | Endpoint |
|---|---|---|
| Riesgo País | [ArgentinaDatos](https://argentinadatos.com/) | `/v1/finanzas/indices/riesgo-pais` |
| Reservas | [BCRA API v4](https://api.bcra.gob.ar) | `/estadisticas/v4.0/monetarias/1` |
| Compras diarias | [BCRA API v4](https://api.bcra.gob.ar) | `/estadisticas/v4.0/monetarias/74` |

Sin autenticación. Datos públicos.

## Desarrollo local

```bash
npm install
npm run dev
```

## Agregar hitos

Editá `src/lib/hitos.ts` y agregá un objeto al array `HITOS`:

```ts
{
  id: 'id-unico',
  fecha: 'YYYY-MM-DD',
  titulo: 'Descripción corta',
  descripcion: 'Opcional — texto largo',
  tag: 'deuda' | 'politico' | 'macro' | 'bcra',
  indicador: 'riesgo-pais' | 'reservas' | 'compras' | 'global',
  fuente: 'Fuente opcional',
  automatico: false,
}
```
