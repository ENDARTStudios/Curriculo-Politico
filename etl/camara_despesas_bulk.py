"""
ETL — Despesas (CEAP) via datasets bulk oficiais da Câmara.
Fonte: https://www.camara.leg.br/cotas/Ano-{YYYY}.csv.zip
Substitui a API v2 /despesas (que está vazia). Agrega por deputado/ano.
Saída: data/raw/camara_despesas_bulk_raw.json
"""
import csv
import io
import json
import os
import zipfile
from pathlib import Path

import requests

RAW_DIR = Path("data/raw")
BULK_BASE = "https://www.camara.leg.br/cotas"
ANOS = [2023, 2024, 2025, 2026]
HEADERS = {"User-Agent": "CurriculoPolitico/1.0 (Projeto Open Source de Transparencia)"}


def download_anual(ano: int) -> str | None:
    url = f"{BULK_BASE}/Ano-{ano}.csv.zip"
    print(f"📥 Baixando {url}...", flush=True)
    try:
        res = requests.get(url, timeout=300, headers=HEADERS)
        res.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(res.content)) as zf:
            csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            if not csv_names:
                print(f"   ⚠️ zip sem CSV: {zf.namelist()}")
                return None
            with zf.open(csv_names[0]) as f:
                return f.read().decode("latin1")
    except (requests.RequestException, zipfile.BadZipFile, KeyError) as e:
        print(f"   ❌ {ano}: {e}")
        return None


def parse_bulk(content: str) -> dict[tuple[str, int], float]:
    """Agrega por (ideCadastro, numAno da linha). valorLiquido é o gasto real."""
    reader = csv.DictReader(io.StringIO(content), delimiter=";")
    agregado: dict[tuple[str, int], float] = {}
    for row in reader:
        ide = (row.get("ideCadastro") or "").strip()
        ano_str = (row.get("numAno") or "").strip()
        if not ide or not ano_str.isdigit():
            continue
        valor_str = (row.get("vlrLiquido") or row.get("vlrDocumento") or "0").strip()
        try:
            valor = float(valor_str.replace(",", "."))
        except ValueError:
            continue
        key = (ide, int(ano_str))
        agregado[key] = agregado.get(key, 0.0) + valor
    return agregado


def run():
    print("💰 ETL de Despesas Bulk da Câmara...\n")

    all_aggregated: dict[tuple[str, int], float] = {}
    for ano in ANOS:
        content = download_anual(ano)
        if content is None:
            continue
        parte = parse_bulk(content)
        print(f"   ✅ {ano}: {len(parte)} deputados com despesas", flush=True)
        for key, total in parte.items():
            all_aggregated[key] = all_aggregated.get(key, 0.0) + total

    registros = [
        {"ideCadastro": ide, "ano": ano, "total": round(total, 2)}
        for (ide, ano), total in sorted(all_aggregated.items())
    ]

    os.makedirs(RAW_DIR, exist_ok=True)
    out = RAW_DIR / "camara_despesas_bulk_raw.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False)

    print(f"\n✅ {len(registros)} registros agregados salvos em {out}")


if __name__ == "__main__":
    run()
