"""
ETL — Menções em diários oficiais municipais via Querido Diário (OKBR).
API pública: https://queridodiario.ok.org.br/api
503 = serviço fora do ar (já ocorreu); reexecutar depois.
Saída: data/raw/municipal_gazettes_raw.json
"""
import json
import os
import time
from datetime import datetime, timedelta

import requests

RAW_DIR = "data/raw"
QD_API = "https://queridodiario.ok.org.br/api"
HEADERS = {"User-Agent": "CurriculoPolitico/1.0 (Pesquisa Transparente - OKBR)"}

PRIORITY_CITIES = [
    {"name": "São Paulo", "state": "SP", "territory_id": "3550308"},
    {"name": "Rio de Janeiro", "state": "RJ", "territory_id": "3304557"},
    {"name": "Belo Horizonte", "state": "MG", "territory_id": "3106200"},
    {"name": "Salvador", "state": "BA", "territory_id": "2927408"},
    {"name": "Fortaleza", "state": "CE", "territory_id": "2304400"},
    {"name": "Brasília", "state": "DF", "territory_id": "5300108"},
    {"name": "Curitiba", "state": "PR", "territory_id": "4106902"},
    {"name": "Recife", "state": "PE", "territory_id": "2611606"},
    {"name": "Porto Alegre", "state": "RS", "territory_id": "4314902"},
    {"name": "Manaus", "state": "AM", "territory_id": "1302603"},
]

KEYWORDS = [
    "verba de gabinete", "dispensa de licitação", "inexigibilidade",
    "improbidade", "cassação", "afastamento",
]


def search_gazettes(territory_id: str, since: str):
    res = requests.get(
        f"{QD_API}/gazettes",
        params={"territory_id": territory_id, "published_since": since, "size": 50},
        headers=HEADERS, timeout=30,
    )
    if res.status_code != 200:
        return []
    return res.json().get("gazettes", [])


def run():
    print("🏛️ ETL Diários Oficiais Municipais (Querido Diário)\n")
    since = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    all_mentions = []

    for city in PRIORITY_CITIES:
        print(f"🔍 {city['name']}/{city['state']}...", flush=True)
        try:
            gazettes = search_gazettes(city["territory_id"], since)
        except requests.RequestException as e:
            print(f"   ❌ {e}")
            time.sleep(5)
            continue

        count = 0
        for gaz in gazettes:
            gaz_id = gaz.get("gazette_id")
            if not gaz_id:
                continue
            try:
                content_res = requests.get(
                    f"{QD_API}/gazettes/{gaz_id}", headers=HEADERS, timeout=30
                )
                if content_res.status_code != 200:
                    continue
                content = content_res.json().get("content", "") or ""
            except requests.RequestException:
                continue

            content_lower = content.lower()
            for kw in KEYWORDS:
                idx = content_lower.find(kw.lower())
                if idx == -1:
                    continue
                start = max(0, idx - 100)
                end = min(len(content), idx + 100)
                all_mentions.append({
                    "municipality": city["name"],
                    "state": city["state"],
                    "published_at": gaz.get("date"),
                    "gazette_url": gaz.get("url") or gaz.get("file_url") or "",
                    "keyword": kw,
                    "excerpt": content[start:end].strip(),
                })
                count += 1
            time.sleep(0.5)  # rate limit OKBR
        print(f"   ✅ {count} menções", flush=True)

    os.makedirs(str(RAW_DIR), exist_ok=True)
    out = os.path.join(str(RAW_DIR), "municipal_gazettes_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_mentions, f, ensure_ascii=False)
    print(f"\n✅ {len(all_mentions)} menções agregadas em {out}")


if __name__ == "__main__":
    run()
