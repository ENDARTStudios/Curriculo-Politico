"""
ETL — CEAP (Cota para o Exercício da Atividade Parlamentar) por deputado
Coleta as despesas do ano corrente via /deputados/{id}/despesas somando
valorLiquido (fallback valorDocumento).
Saída: data/raw/camara_ceap_raw.json
"""
import json
import os
import time
from datetime import datetime

import requests

API_URL = "https://dadosabertos.camara.leg.br/api/v2"
RAW_DIR = os.path.join("data", "raw")
HEADERS = {
    "User-Agent": "CurriculoPolitico/1.0 (Projeto Open Source de Transparencia)",
    "Accept": "application/json",
}
ANO = datetime.now().year


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


def fetch_despesas_total(dep_id, ano):
    total = 0.0
    pagina = 1
    while True:
        try:
            res = requests.get(
                f"{API_URL}/deputados/{dep_id}/despesas?ano={ano}"
                f"&ordem=ASC&ordenarPor=ano&itens=100&pagina={pagina}",
                headers=HEADERS, timeout=30,
            )
            res.raise_for_status()
        except requests.RequestException as e:
            print(f"   ⚠️ {dep_id} p{pagina}: {e}")
            break
        despesas = res.json().get("dados", [])
        if not despesas:
            break
        for d in despesas:
            valor = d.get("valorLiquido")
            if valor is None:
                valor = d.get("valorDocumento", 0)
            try:
                total += float(valor or 0)
            except (TypeError, ValueError):
                pass
        if not any(l.get("rel") == "next" for l in res.json().get("links", [])):
            break
        pagina += 1
        time.sleep(0.25)
    return total


def run():
    deputy_ids = fetch_all_deputy_ids()
    print(f"💰 Coletando CEAP {ANO} de {len(deputy_ids)} deputados...\n")

    resultados = []
    for i, dep_id in enumerate(deputy_ids, 1):
        total = fetch_despesas_total(dep_id, ANO)
        resultados.append({
            "deputado_id": str(dep_id),
            "ano": ANO,
            "total_ceap": round(total, 2),
        })
        if i % 50 == 0:
            print(f"[{i}/{len(deputy_ids)}] processados", flush=True)
        time.sleep(0.25)

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "camara_ceap_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False)
    print(f"\n✅ {len(resultados)} deputados com CEAP {ANO} coletados em {out}")


if __name__ == "__main__":
    run()
