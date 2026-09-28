# Modelo de Dados Canônico

## Entidades Principais (Resumo SQL/Prisma)

### Identidade e Mandatos
- `Person` (id, name, political_name, birth_year, tse_id, photo_url)
- `Party` (id, acronym, name, ideology, founded_at)
- `Office` (id, type [EXECUTIVE, LEGISLATIVE], name, jurisdiction)
- `Term` (id, person_id, office_id, start_year, end_year, status)

### Desempenho e Auditoria
- `LegislativeAction` (id, term_id, action_type [PROPOSED, APPROVED, VOTED], bill_id, vote_direction)
- `FinancialRecord` (id, term_id, type [SALARY, EXPENSE, CAMPAIGN], amount, year, source)
- `LegalRecord` (id, person_id, type [INVESTIGATION, LAWSUIT, CONDEMNATION, IMPEACHMENT], status, court, source_url, retrieved_at)

### Pontuação (IDIP)
- `Score` (id, term_id, version, final_score, confidence_score, reliability_status [GREEN, YELLOW, RED, GRAY], calculated_at)
- `ScoreBreakdown` (id, score_id, dimension [INTEGRITY, PRODUCTIVITY...], weight, raw_value, normalized_value, evidence_json)
