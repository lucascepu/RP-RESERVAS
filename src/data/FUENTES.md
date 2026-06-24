# Fuentes de datos — RP-RESERVAS

## Vol. MULC (`mulc.json`)
**Fuente:** [MAE Market Data](https://marketdata.mae.com.ar/forex)  
**Sección:** Forex → Detalle de volumen de operaciones → Mayorista  
**Instrumentos incluidos:** USMEP + UST$T + USB$T  
**Unidad:** millones de USD (MM USD), con 2 decimales  
**Frecuencia:** diaria (ruedas hábiles)  
**Carga:** manual vía `/admin` hasta automatización via API MAE (pendiente whitelist IP)

## Compras BCRA (`compras.json`)
**Fuente:** comunicados BCRA / prensa financiera  
**Unidad:** millones de USD (MM USD)  
**Frecuencia:** diaria  
**Carga:** manual vía `/admin`

## Reservas Brutas (`reservas.json`)
**Fuente:** BCRA  
**Unidad:** millones de USD (MM USD)  
**Frecuencia:** diaria  
**Carga:** manual vía `/admin`

## Riesgo País (`riesgo-pais.json`)
**Fuente:** Argentina Datos / Ámbito Financiero (scraping automático)  
**Unidad:** puntos básicos (pbs)  
**Frecuencia:** diaria — GitHub Action 17:30 AR, lun-vie  
**Carga:** automática
