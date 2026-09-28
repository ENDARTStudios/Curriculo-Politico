"""
ETL — Câmbara dos Deputados completa (censo: ~513 deputados em exercício)
Paginação completa do endpoint /deputados + detalhes individuais.
Saída: data/raw/camara_completa_raw.json (mesma estrutura do detalhe
individual usada por scripts/load-camara-completa.ts)

Uso: python etl/camara_completa.py
"""
import json
import os
import time

import requests

API_URL = "https://dadosabertos.camara.leg.br/api/v2"
RAW_DIR = os.path.join("data", "raw")
HEADERS = {
    "User-Agent": "RadarCivico/1.0 (Projeto Open Source de Transparencia)",
    "Accept": "application/json",
}


def fetch_all_deputies():
    print("🔍 Buscando todos os deputados em exercício...")
    all_deputies = []
    page = 1
    while True:
        url = f"{API_URL}/deputados?ordem=ASC&ordenarPor=id&pagina={page}&itens=100"
        try:
            res = requests.get(url, headers=HEADERS, timeout=30)
            res.raise_for_status()
        except requests.RequestException as e:
            print(f"❌ Erro na página {page}: {e}")
            break
        deputies = res.json().get("dados", [])
        if not deputies:
            break
        all_deputies.extend(deputies)
        print(f"   Página {page}: {len(deputies)} deputados (total: {len(all_deputies)})", flush=True)
        has_next = any(l.get("rel") == "next" for l in res.json().get("links", []))
        if not has_next:
            break
        page += 1
        time.sleep(0.5)
    print(f"✅ {len(all_deputies)} deputados listados")
    return all_deputies


def fetch_deputy_details(deputy_id):
    try:
        res = requests.get(f"{API_URL}/deputados/{deputy_id}", headers=HEADERS, timeout=30)
        res.raise_for_status()
        return res.json().get("dados", {})
    except requests.RequestException as e:
        print(f"   ⚠️ ID {deputy_id}: {e}")
        return {}


def run():
    deputies = fetch_all_deputies()

    detailed = []
    falhas = 0
    for i, dep in enumerate(deputies, 1):
        details = fetch_deputy_details(dep["id"])
        if details:
            detailed.append(details)
        else:
            falhas += 1
        if i % 25 == 0:
            print(f"   [{i}/{len(deputies)}] detalhados: {len(detailed)}", flush=True)
        time.sleep(0.3)

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "camara_completa_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(detailed, f, ensure_ascii=False)
    print(f"\n✅ {len(detailed)} deputados com detalhes salvos em {out} ({falhas} falhas)")


if __name__ == "__main__":
    run()
