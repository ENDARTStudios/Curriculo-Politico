"""
ETL — Votações nominais recentes da Câmara dos Deputados
Coleta as N votações mais recentes e os votos de cada deputado.
Saída: data/raw/camara_votacoes_raw.json
Uso: python etl/camara_votacoes.py [--limit 15]
"""
import argparse
import json
import os
import time

import requests

API_URL = "https://dadosabertos.camara.leg.br/api/v2"
RAW_DIR = os.path.join("data", "raw")
HEADERS = {
    "User-Agent": "CurriculoPolitico/1.0 (Projeto Open Source de Transparencia)",
    "Accept": "application/json",
}


def fetch_votacoes(limit=15):
    try:
        res = requests.get(
            f"{API_URL}/votacoes?ordem=DESC&ordenarPor=data&itens={limit}",
            headers=HEADERS, timeout=15,
        )
        res.raise_for_status()
        return res.json().get("dados", [])[:limit]
    except requests.RequestException as e:
        print(f"Erro API Câmara (votações): {e}")
        return []


def fetch_votos(vot_id):
    try:
        res = requests.get(f"{API_URL}/votacoes/{vot_id}/votos", headers=HEADERS, timeout=15)
        res.raise_for_status()
        return res.json().get("dados", [])
    except (requests.RequestException, ValueError):
        return []


def run(limit=15):
    print(f"🔍 Buscando {limit} votações recentes...")
    votacoes = fetch_votacoes(limit=limit)
    all_votes = []

    for v in votacoes:
        print(f"   Coletando votos da votação {v['id']}...")
        votos = fetch_votos(v["id"])
        for voto in votos:
            dep = voto.get("deputado_") or voto.get("deputado") or {}
            if not dep.get("id"):
                continue
            all_votes.append({
                "votacao_id": str(v["id"]),
                "deputado_id": str(dep["id"]),
                "nome": dep.get("nome"),
                "voto": voto.get("voto"),
            })
        time.sleep(1)  # Evita HTTP 429

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "camara_votacoes_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_votes, f, ensure_ascii=False, indent=2)
    print(f"✅ {len(all_votes)} votos de {len(votacoes)} votações salvos em {out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL votações Câmara")
    parser.add_argument("--limit", type=int, default=15,
                        help="Quantidade de votações recentes (default: 15)")
    args = parser.parse_args()
    run(limit=args.limit)
