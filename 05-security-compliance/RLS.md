# RLS — Row Level Security (Supabase)

## Status: Não configurado

O projeto usa Prisma com connection string direta (não via Data API do Supabase),
então RLS não se aplica às queries da aplicação. O role `curriculo_app` tem GRANT
ALL no schema public, o que equivale a acesso irrestrito a nível de banco.

## Quando RLS será necessário
Se expusermos o Supabase Data API (PostgREST) diretamente para o cliente.
Atualmente, TODAS as queries passam pelo Next.js Server (nunca client → Supabase).

## Recomendação
Manter RLS desabilitado e continuar com Next.js como única porta de entrada.
Habilitar RLS apenas se adicionar Supabase Auth/Realtime/Storage.
