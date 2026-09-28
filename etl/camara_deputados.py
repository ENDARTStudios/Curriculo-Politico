"""
ETL MVP — Câmara dos Deputados (Dados Abertos)
Coleta os deputados em exercício e salva os dados brutos em data/raw/.
Uso: python etl/camara_deputados.py [--limit 10]
Documentação da API: https://dadosabertos.camara.leg.br/swagger/api/v2
"""
import argparse
import json
import os
import time

import pandas as pd
import requests

API_URL = "https://dadosabertos.camara.leg.br/api/v2"
RAW_DIR = os.path.join("data", "raw")
HEADERS = {
    "User-Agent": "RadarCivico/1.0 (Projeto Open Source de Transparencia)",
    "Accept": "application/json",
}


def fetch_deputies(limit=100):
    """Busca a primeira página de deputados atuais."""
    url = f"{API_URL}/deputados?ordem=ASC&ordenarPor=id&itens={limit}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.json().get("dados", [])
    except requests.RequestException as e:
        print(f"Erro ao buscar deputados: {e}")
        return []


def fetch_deputy_details(deputy_id):
    """Busca detalhes de um deputado específico."""
    url = f"{API_URL}/deputados/{deputy_id}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        return response.json().get("dados", {})
    except requests.RequestException as e:
        print(f"Erro ao buscar detalhes do ID {deputy_id}: {e}")
        return {}


def run_etl(limit=10):
    print(f"Iniciando ETL: Câmara dos Deputados (limite={limit})...")
    deputies = fetch_deputies(limit=limit)

    records = []
    raw_payload = []
    for dep in deputies:
        print(f"Processando: {dep['nome']} (ID: {dep['id']})")
        details = fetch_deputy_details(dep["id"])

        if details:
            raw_payload.append(details)
            status = details.get("ultimoStatus", {})
            records.append({
                "id_camara": details.get("id"),
                "nome_civil": details.get("nomeCivil"),
                "nome_urna": status.get("nomeEleitoral"),
                "partido_sigla": status.get("siglaPartido"),
                "uf": status.get("siglaUf"),
                "url_foto": status.get("urlFoto"),
                "email": status.get("gabinete", {}).get("email"),
                "data_coleta": pd.Timestamp.now(),
            })
        time.sleep(0.5)  # Rate limiting educado

    if not records:
        print("⚠️ Nenhum dado coletado.")
        return

    os.makedirs(RAW_DIR, exist_ok=True)

    # Camada Raw imutável (JSON completo, conforme ARCHITECTURE.md)
    raw_path = os.path.join(RAW_DIR, "camara_deputados_raw.json")
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw_payload, f, ensure_ascii=False)

    # Camada curada mínima (CSV p/ carga inicial no Postgres)
    csv_path = os.path.join(RAW_DIR, "raw_data_camara.csv")
    pd.DataFrame(records).to_csv(csv_path, index=False, encoding="utf-8")

    print(f"✅ Sucesso: {len(records)} registros salvos em {csv_path}")
    print(f"✅ Raw completo salvo em {raw_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL Câmara dos Deputados")
    parser.add_argument("--limit", type=int, default=10,
                        help="Quantidade de deputados a coletar (default: 10)")
    args = parser.parse_args()
    run_etl(limit=args.limit)
