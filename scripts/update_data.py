#!/usr/bin/env python3
import urllib.request
import json
import os
from datetime import datetime, timezone, timedelta

AR_TZ = timezone(timedelta(hours=-3))
hoy = datetime.now(AR_TZ).strftime('%Y-%m-%d')

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))

def update_rp():
    path = 'src/data/riesgo-pais.json'
    data = load_json(path)
    last_fecha = data[-1]['f']

    try:
        fresh = fetch('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais')
        # API devuelve lista de {fecha, valor}
        nuevos = [
            {"f": d['fecha'][:10], "v": int(d['valor'])}
            for d in fresh
            if d['fecha'][:10] > last_fecha and int(d['valor']) > 0
        ]
        if nuevos:
            nuevos.sort(key=lambda x: x['f'])
            data.extend(nuevos)
            save_json(path, data)
            print(f"RP: agregados {len(nuevos)} puntos — último: {data[-1]}")
        else:
            print(f"RP: sin datos nuevos (último: {last_fecha})")
    except Exception as e:
        print(f"RP error: {e}")

def update_reservas():
    path = 'src/data/reservas.json'
    data = load_json(path)
    last_fecha = data[-1]['f']

    try:
        desde = last_fecha
        hasta = hoy
        url = f'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1?desde={desde}&hasta={hasta}&limit=100'
        resp = fetch(url)
        detalle = resp.get('results', [{}])[0].get('detalle', [])
        nuevos = [
            {"f": d['fecha'][:10], "v": round(float(d['valor']), 1)}
            for d in detalle
            if d['fecha'][:10] > last_fecha and float(d['valor']) > 0
        ]
        if nuevos:
            nuevos.sort(key=lambda x: x['f'])
            data.extend(nuevos)
            save_json(path, data)
            print(f"Reservas: agregados {len(nuevos)} puntos — último: {data[-1]}")
        else:
            print(f"Reservas: sin datos nuevos (último: {last_fecha})")
    except Exception as e:
        print(f"Reservas error: {e}")

if __name__ == '__main__':
    print(f"Actualizando datos — {hoy} (AR)")
    update_rp()
    update_reservas()
    print("Listo.")
