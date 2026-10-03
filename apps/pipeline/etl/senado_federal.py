"""
ETL — Senadores em exercício (Dados Abertos do Senado Federal)
Endpoint: https://legis.senado.leg.br/dadosabertos/senador/lista
Saída: data/raw/senado_federal_raw.json
"""
import json
import os

import requests

API_URL = "https://legis.senado.leg.br/dadosabertos/senador/lista/atual"
RAW_DIR = os.path.join("data", "raw")
HEADERS = {
    "User-Agent": "CurriculoPolitico/1.0 (Projeto Open Source de Transparencia)",
    "Accept": "application/json",
}


def run():
    print("🔍 Buscando senadores em exercício...")
    try:
        res = requests.get(API_URL, headers=HEADERS, timeout=15)
        res.raise_for_status()
        data = res.json()
    except (requests.RequestException, ValueError) as e:
        print(f"Erro API Senado: {e}")
        return

    # Estrutura aninhada do Senado: ListaParlamentarEmExercicio → Parlamentares → [Parlamentar]
    parlamentares = (
        data.get("ListaParlamentarEmExercicio", {})
        .get("Parlamentares", {})
        .get("Parlamentar", [])
    )
    if isinstance(parlamentares, dict):  # API às vezes devolve objeto único
        parlamentares = [parlamentares]

    processed = []
    for s in parlamentares:
        ident = s.get("IdentificacaoParlamentar", {})
        processed.append({
            # Chaves reais da API: SiglaPartidoParlamentar, UfParlamentar,
            # NomeCompletoParlamentar (não SiglaPartido/SiglaUf/NomeCivilParlamentar)
            "id_senado": str(ident.get("CodigoParlamentar", "")).strip(),
            "nome_civil": (ident.get("NomeCompletoParlamentar") or ident.get("NomeParlamentar") or "").strip(),
            "nome_urna": (ident.get("NomeParlamentar") or "").strip(),
            "partido_sigla": (ident.get("SiglaPartidoParlamentar") or "SEM").strip(),
            "uf": (ident.get("UfParlamentar") or "BR").strip(),
            "url_foto": (ident.get("UrlFotoParlamentar") or "").strip(),
        })

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "senado_federal_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(processed, f, ensure_ascii=False, indent=2)
    print(f"✅ {len(processed)} senadores salvos em {out}")


if __name__ == "__main__":
    run()
