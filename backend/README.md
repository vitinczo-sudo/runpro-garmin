# RunPro Garmin Backend

Backend scaffold para conectar o app com Garmin Connect Developer Program via OAuth2 PKCE.

## O que este backend ja faz

- inicia OAuth2 PKCE (`/api/garmin/connect/start`);
- recebe callback OAuth (`/api/garmin/connect/callback`);
- armazena token por atleta localmente em `data/store.json`;
- endpoint de status da conexao (`/api/users/:id/garmin`);
- endpoint de desconexao (`DELETE /api/users/:id/garmin`);
- endpoint de webhook de atividades (`/api/garmin/webhooks/activity`);
- endpoint para puxar atividades (`/api/sync/activities/pull`);
- endpoint para enviar treino estruturado (`/api/sync/workouts/push`).

## Setup local

1. Copie `backend/.env.example` para `backend/.env`.
2. Preencha credenciais Garmin e URLs oficiais da sua aplicacao aprovada.
3. Rode:

```bash
cd backend
node server.mjs
```

4. Teste:

```text
GET http://localhost:8787/health
```

## Deploy no Render (passo a passo)

1. Suba este projeto para GitHub.
2. No Render, crie `New +` -> `Blueprint` e selecione o repo.
3. O Render vai ler `render.yaml` na raiz e criar o servico `runpro-garmin`.
4. Apos criar, abra `Environment` e preencha:
`GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, `GARMIN_OAUTH_AUTHORIZE_URL`, `GARMIN_OAUTH_TOKEN_URL`, `GARMIN_ACTIVITY_PULL_URL`, `GARMIN_TRAINING_PUSH_URL`.
5. Ajuste as URLs fixas para o dominio real gerado no Render:
`FRONTEND_ORIGIN`, `FRONTEND_ORIGINS`, `APP_BASE_URL`, `APP_PUBLIC_URL`.
6. Em Garmin Developer Program, configure:
`Redirect URI`: `https://SEU-SERVICO.onrender.com/api/garmin/connect/callback`
`Webhook`: `https://SEU-SERVICO.onrender.com/api/garmin/webhooks/activity`
7. Re-deploy e teste:
`https://SEU-SERVICO.onrender.com/health`

## Fluxo de conexao

1. Front chama `GET /api/garmin/connect/start?user_id=SEU_ID&redirect=1`
2. Usuario autoriza no Garmin.
3. Garmin redireciona para `/api/garmin/connect/callback`.
4. Backend troca `code` por tokens e salva conexao do usuario.

## Observacoes importantes

- As URLs OAuth e endpoints variam conforme a documentacao/projeto Garmin aprovado.
- No plano free do Render o filesystem e efemero. O arquivo `data/store.json` pode ser perdido em restart/redeploy.
- Para producao, mova tokens/logs para banco externo (Postgres/Supabase/Neon).
- Nao suba este backend em producao sem:
  - banco real;
  - criptografia de tokens em repouso;
  - HTTPS;
  - rotacao de segredos;
  - auditoria de logs;
  - rate limiting;
  - autenticacao dos endpoints.
