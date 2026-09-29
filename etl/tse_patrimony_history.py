"""
ETL — Patrimônio histórico multi-eleição (bem_candidato por ano).
TSE CDN: 403 Akamai intermitente — tentativa direta + caminho manual.
SQ_CANDIDATO NÃO é estável entre eleições; o load casa por tseId da
eleição correspondente ou nome completo normalizado.
Saída: data/raw/tse_patrimony_history_raw.json
"""
import csv
import io
import json
import os
import zipfile
from pathlib import Path

import requests

RAW_DIR = Path("data/raw")
TSE_BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
ANOS = [2022, 2018]  # anos na base do Currículo; expandir p/ 2014-2010 depois


def download_bem(ano: int) -> str | None:
    local = RAW_DIR / f"tse_{ano}" / f"bem_candidato_{ano}_BRASIL.csv"
    if local.exists():
        return local.read_text(encoding="latin1")

    url = f"{TSE_BASE}/bem_candidato/bem_candidato_{ano}.zip"
    print(f"📥 Baixando {url}...", flush=True)
    try:
        res = requests.get(url, timeout=300, headers={
            "User-Agent": "CurriculoPolitico/1.0 (Projeto Open Source de Transparencia)",
        })
        if res.status_code == 403:
            print(f"   ⚠️ {ano}: CDN bloqueado (403 Akamai).")
            print(f"   Baixe manualmente e extraia em: {local.parent}/")
            return None
        res.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(res.content)) as zf:
            csvs = [n for n in zf.namelist() if n.lower().endswith(".csv")]
            with zf.open(csvs[0]) as f:
                content = f.read().decode("latin1")
        local.parent.mkdir(parents=True, exist_ok=True)
        local.write_text(content, encoding="latin1")
        return content
    except requests.RequestException as e:
        print(f"   ❌ {ano}: {e}")
        return None


def parse(content: str, ano: int) -> dict[str, dict]:
    reader = csv.DictReader(io.StringIO(content), delimiter=";")
    agregado: dict[str, dict] = {}
    for row in reader:
        sq = (row.get("SQ_CANDIDATO") or "").strip()
        if not sq:
            continue
        try:
            valor = float((row.get("VR_BEM_CANDIDATO") or "0").strip().replace(",", "."))
        except ValueError:
            continue
        if sq not in agregado:
            agregado[sq] = {
                "sq": sq,
                "nome": (row.get("NM_CANDIDATO") or "").strip(),
                "year": ano,
                "total": 0.0,
                "count": 0,
            }
        agregado[sq]["total"] += valor
        agregado[sq]["count"] += 1
    return agregado


def run():
    print("💎 ETL Patrimônio Histórico (multi-eleição)\n")
    todos: dict[tuple[str, int], dict] = {}

    for ano in ANOS:
        content = download_bem(ano)
        if not content:
            print(f"   ⚠️ {ano}: indisponível")
            continue
        parsed = parse(content, ano)
        print(f"   ✅ {ano}: {len(parsed)} candidatos com bens")
        for key, data in parsed.items():
            todos[key] = data

    registros = sorted(todos.values(), key=lambda r: (r["year"], r["sq"]))
    out = RAW_DIR / "tse_patrimony_history_raw.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False)
    print(f"\n✅ {len(registros)} registros históricos salvos em {out}")


if __name__ == "__main__":
    import json
    run()
