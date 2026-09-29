"""
ETL — Proposições de autoria dos deputados (Câmara)
Endpoint: /proposicoes?idDeputadoAutor={id} (o filtro `autor=` NÃO funciona).
Mapeamento real da listagem: id, siglaTipo, ementa, dataApresentacao
(não há `status` no payload de lista).
Saída: data/raw/camara_proposicoes_raw.json
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


def fetch_all_deputy_ids():
    ids = []
    pagina = 1
    while True:
        res = requests.get(
            f"{API_URL}/deputados?ordem=ASC&ordenarPor=id&itens=100&pagina={pagina}",
            headers=HEADERS, timeout=30,
        )
        res.raise_for_status()
        deps = res.json().get("dados", [])
        if not deps:
            break
        ids.extend(d["id"] for d in deps)
        if not any(l.get("rel") == "next" for l in res.json().get("links", [])):
            break
        pagina += 1
        time.sleep(0.3)
    return ids


def fetch_proposicoes(dep_id):
    """Últimas 100 proposições do deputado (ordenadas por id DESC)."""
    try:
        res = requests.get(
            f"{API_URL}/proposicoes?idDeputadoAutor={dep_id}&ordem=DESC&ordenarPor=id&itens=100",
            headers=HEADERS, timeout=30,
        )
        res.raise_for_status()
        return res.json().get("dados", [])
    except requests.RequestException as e:
        print(f"   ⚠️ {dep_id}: {e}")
        return []


def run():
    deputy_ids = fetch_all_deputy_ids()
    print(f"📥 Coletando proposições de {len(deputy_ids)} deputados...\n")

    all_bills = []
    for i, dep_id in enumerate(deputy_ids, 1):
        for prop in fetch_proposicoes(dep_id):
            all_bills.append({
                "deputado_id": str(dep_id),
                "proposicao_id": str(prop.get("id", "")),
                "titulo": (prop.get("ementa") or "")[:200],
                "tipo": prop.get("siglaTipo"),
                "ano": prop.get("ano"),
                "data_apresentacao": prop.get("dataApresentacao"),
            })
        if i % 50 == 0:
            print(f"[{i}/{len(deputy_ids)}] proposições: {len(all_bills)}", flush=True)
        time.sleep(0.4)

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "camara_proposicoes_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_bills, f, ensure_ascii=False)
    print(f"\n✅ {len(all_bills)} proposições coletadas em {out}")


if __name__ == "__main__":
    run()
