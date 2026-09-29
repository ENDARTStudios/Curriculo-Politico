"""
ETL — Presença em sessões deliberativas (Câmara)
A API v2 não expõe registro de AUSÊNCIAS (frequência oficial sai em PDF).
Endpoint real: /deputados/{id}/eventos filtrando descricaoTipo
"Sessão Deliberativa" — cada evento = presença confirmada (apenas positivos).
Saída: data/raw/camara_presenca_raw.json
"""
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
START_DATE = "2023-02-01"


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


def fetch_sessoes_deliberativas(dep_id):
    sessoes = []
    pagina = 1
    while True:
        try:
            res = requests.get(
                f"{API_URL}/deputados/{dep_id}/eventos"
                f"?dataInicio={START_DATE}&itens=100&pagina={pagina}"
                f"&ordem=ASC&ordenarPor=dataHoraInicio",
                headers=HEADERS, timeout=30,
            )
            res.raise_for_status()
        except requests.RequestException as e:
            print(f"   ⚠️ {dep_id} p{pagina}: {e}")
            break
        eventos = res.json().get("dados", [])
        sessoes.extend(
            e for e in eventos
            if (e.get("descricaoTipo") or "").startswith("Sessão Deliberativa")
        )
        if not eventos or not any(l.get("rel") == "next" for l in res.json().get("links", [])):
            break
        pagina += 1
        time.sleep(0.3)
    return sessoes


def run():
    deputy_ids = fetch_all_deputy_ids()
    print(f"📥 Coletando presença de {len(deputy_ids)} deputados...\n")

    all_attendance = []
    for i, dep_id in enumerate(deputy_ids, 1):
        for ev in fetch_sessoes_deliberativas(dep_id):
            all_attendance.append({
                "deputado_id": str(dep_id),
                "evento_id": str(ev.get("id", "")),
                "data_sessao": (ev.get("dataHoraInicio") or "")[:10],
                "tipo_sessao": ev.get("descricaoTipo"),
                "presente": True,  # endpoint lista apenas eventos com participação
            })
        if i % 50 == 0:
            print(f"[{i}/{len(deputy_ids)}] presenças: {len(all_attendance)}", flush=True)
        time.sleep(0.35)

    os.makedirs(RAW_DIR, exist_ok=True)
    out = os.path.join(RAW_DIR, "camara_presenca_raw.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(all_attendance, f, ensure_ascii=False)
    print(f"\n✅ {len(all_attendance)} registros de presença coletados em {out}")


if __name__ == "__main__":
    run()
