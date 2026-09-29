"""
ETL — Histórico completo de votações plenárias da legislatura atual
Varre /votacoes de 2023-02-01 até hoje (filtro PLEN), coleta os votos
nominais de cada sessão e salva metadados (denominador da taxa de
participação).
Saída: data/raw/camara_votacoes_historico_raw.json (+ _meta.json)
Uso: python etl/camara_votacoes_historico.py
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
START_DATE = "2023-02-01"
END_DATE = datetime.now().strftime("%Y-%m-%d")


def fetch_votacoes_page(pagina=1, itens=100):
    # API não aceita dataInicio+dataFim juntos (400); idOrgao=180 = Plenário.
    # dataInicio sem dataFim retorna tudo do período informado até hoje.
    url = (
        f"{API_URL}/votacoes"
        f"?idOrgao=180&dataInicio={START_DATE}"
        f"&ordem=ASC&ordenarPor=data"
        f"&pagina={pagina}&itens={itens}"
    )
    try:
        res = requests.get(url, headers=HEADERS, timeout=30)
        res.raise_for_status()
        return res.json()
    except requests.RequestException as e:
        print(f"   ⚠️ Página {pagina}: {e}")
        return {"dados": [], "links": []}


def fetch_all_votacoes():
    print(f"🔍 Buscando votações plenárias de {START_DATE} a {END_DATE}...")
    all_votacoes = []
    pagina = 1
    while True:
        data = fetch_votacoes_page(pagina)
        votacoes = [
            v for v in data.get("dados", [])
            if (v.get("siglaOrgao") or "").upper() == "PLEN"
        ]
        if not data.get("dados"):
            break
        all_votacoes.extend(votacoes)
        print(f"   Página {pagina}: {len(data['dados'])} votações ({len(votacoes)} PLEN, total PLEN: {len(all_votacoes)})", flush=True)
        has_next = any(l.get("rel") == "next" for l in data.get("links", []))
        if not has_next:
            break
        pagina += 1
        time.sleep(0.4)
    print(f"✅ {len(all_votacoes)} votações plenárias encontradas")
    return all_votacoes


def fetch_votos_nominais(vot_id):
    try:
        res = requests.get(f"{API_URL}/votacoes/{vot_id}/votos", headers=HEADERS, timeout=30)
        res.raise_for_status()
        return res.json().get("dados", [])
    except (requests.RequestException, ValueError):
        return []


def run():
    votacoes = fetch_all_votacoes()

    all_votes = []
    nominal_count = 0
    simbolica_count = 0

    for i, v in enumerate(votacoes, 1):
        vot_id = v.get("id")
        votos = fetch_votos_nominais(vot_id)
        if not votos:
            simbolica_count += 1
        else:
            nominal_count += 1
            for voto in votos:
                dep = voto.get("deputado_") or voto.get("deputado") or {}
                if not dep.get("id"):
                    continue
                all_votes.append({
                    "votacao_id": str(vot_id),
                    "votacao_data": v.get("data", ""),
                    "votacao_descricao": (v.get("descricao") or "")[:200],
                    "deputado_id": str(dep["id"]),
                    "nome": dep.get("nome"),
                    "sigla_partido": dep.get("siglaPartido"),
                    "sigla_uf": dep.get("siglaUf"),
                    "voto": voto.get("voto"),
                })
        if i % 100 == 0:
            print(f"[{i}/{len(votacoes)}] nominais: {nominal_count} | votos: {len(all_votes)}", flush=True)
        time.sleep(0.35)

    os.makedirs(RAW_DIR, exist_ok=True)

    out_votes = os.path.join(RAW_DIR, "camara_votacoes_historico_raw.json")
    with open(out_votes, "w", encoding="utf-8") as f:
        json.dump(all_votes, f, ensure_ascii=False)  # compacto: arquivo será grande

    metadata = {
        "periodo": {"inicio": START_DATE, "fim": END_DATE},
        "total_votacoes_plenarias": len(votacoes),
        "votacoes_nominais": nominal_count,
        "votacoes_simbolicas": simbolica_count,
        "total_votos_coletados": len(all_votes),
        "gerado_em": datetime.now().isoformat(),
    }
    out_meta = os.path.join(RAW_DIR, "camara_votacoes_historico_meta.json")
    with open(out_meta, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Crawl completo:")
    print(f"   Votações plenárias: {len(votacoes)}")
    print(f"   Nominais: {nominal_count} | Simbólicas: {simbolica_count}")
    print(f"   Votos coletados: {len(all_votes)}")
    print(f"   Salvos em: {out_votes}")


if __name__ == "__main__":
    run()
