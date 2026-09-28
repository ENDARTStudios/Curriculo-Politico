"""
ETL — Votações nominais da Câmara (histórico expandido, 100 sessões)
Coleta as votações mais recentes e os votos de cada deputado.
Saída: data/raw/camara_votacoes_expandido_raw.json
Uso: python etl/camara_votacoes_expandido.py [--limit 100]
"""
import argparse
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


def fetch_votacoes(limit=100):
    """Busca votações do PLENÁRIO desde 2023 (a lista geral mistura comissões,
    que não têm votos nominais de deputados)."""
    coletadas = []
    pagina = 1
    while len(coletadas) < limit and pagina <= 30:
        url = (
            f"{API_URL}/votacoes?dataInicio=2023-01-01&ordem=DESC"
            f"&ordenarPor=data&itens=100&pagina={pagina}"
        )
        try:
            res = requests.get(url, headers=HEADERS, timeout=30)
            res.raise_for_status()
            dados = res.json().get("dados", [])
        except requests.RequestException as e:
            print(f"❌ Erro API Câmara (página {pagina}): {e}")
            break
        if not dados:
            break
        for v in dados:
            if (v.get("siglaOrgao") or "").upper() == "PLEN":
                coletadas.append(v)
                if len(coletadas) >= limit:
                    break
        pagina += 1
    print(f"✅ {len(coletadas)} votações plenárias coletadas ({pagina - 1} página(s))")
    return coletadas


def fetch_votos(vot_id):
    try:
        res = requests.get(f"{API_URL}/votacoes/{vot_id}/votos", headers=HEADERS, timeout=30)
        res.raise_for_status()
        return res.json().get("dados", [])
    except (requests.RequestException, ValueError) as e:
        print(f"   ⚠️ Sessão {vot_id}: {e}")
        return []


def run(limit=100):
    votacoes = fetch_votacoes(limit=limit)
    all_votes = []
    sem_votos = 0

    for i, v in enumerate(votacoes, 1):
        print(f"   [{i}/{len(votacoes)}] Votação {v['id']} ({v.get('data', '')})...", flush=True)
        votos = fetch_votos(v["id"])
        if not votos:
            sem_votos += 1
            continue
        for voto in votos:
            dep = voto.get("deputado_") or voto.get("deputado") or {}
            if not dep.get("id"):
                continue
            all_votes.append({
                "votacao_id": str(v["id"]),
                "votacao_data": v.get("data"),
                "votacao_descricao": v.get("descricao"),
                "deputado_id": str(dep["id"]),
                "nome": dep.get("nome"),
                "voto": voto.get("voto"),
            })
        time.sleep(0.5)  # Rate limiting educado

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "camara_votacoes_expandido_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_votes, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(all_votes)} votos de {len(votacoes) - sem_votos} sessões salvos em {out}")
    if sem_votos:
        print(f"⚠️  {sem_votos} sessões sem votos nominais (simbólicas ou de comissão)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL votações expandido")
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    run(limit=args.limit)
