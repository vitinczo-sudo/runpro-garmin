# RunPro Coach

Protótipo de web app para treinador de corrida profissional com:

- perfil do atleta por objetivo, volume, distância atual e dias disponíveis;
- cadastro inicial com nome, peso, distância desejada e agenda semanal;
- teste de 3 km com cálculo de ritmo médio, estimativas e zonas de treino;
- geração de planilha mensal depois do teste de 3 km;
- biblioteca validada com recovery, base leve, longão, limiar/tempo, tiro/intervalado, fartlek, subida, progressivo, ritmo de prova, prova, força/core e descanso;
- calendário de provas com ajuste automático de carga e polimento;
- fechamento do mês para criar novo ciclo com base no mês anterior;
- diário de treinos realizados com ajuste automático de carga;
- ajuste de carga mais rigido com controle de progressao semanal, espacamento de treinos duros, limite de longao e bloco de retorno (dor/inatividade);
- área Garmin com conexão simulada, importação `.csv`/`.json` e exportação `.json`/`.tcx`.
- login multiusuario com Supabase (perfil individual e isolamento por atleta).

## Como abrir

O app é estático. Abra `index.html` no navegador ou sirva a pasta localmente:

```bash
python -m http.server 4173
```

Depois acesse:

```text
http://127.0.0.1:4173/
```

## Backend Garmin (novo)

Foi adicionado um backend em [backend/README.md](<C:/Users/vitor.bernardo/Documents/Codex/2026-05-19/criar-um-aplicativo-ou-site-que/backend/README.md>) com OAuth2 PKCE e endpoints de sync.

Rodar local:

```bash
cd backend
copy .env.example .env
node server.mjs
```

Healthcheck:

```text
http://localhost:8787/health
```

Com o backend no ar, o botao "Conectar Garmin" do app ja inicia o fluxo OAuth no endpoint local.

## Deploy Render (servico unico)

- Blueprint pronto: [render.yaml](<C:/Users/vitor.bernardo/Documents/Codex/2026-05-19/criar-um-aplicativo-ou-site-que/render.yaml>)
- O backend agora tambem serve o frontend estatico no mesmo dominio.
- Guia completo: [backend/README.md](<C:/Users/vitor.bernardo/Documents/Codex/2026-05-19/criar-um-aplicativo-ou-site-que/backend/README.md>)

## Banco e usuarios (Supabase)

- SQL pronto: [backend/supabase/schema.sql](<C:/Users/vitor.bernardo/Documents/Codex/2026-05-19/criar-um-aplicativo-ou-site-que/backend/supabase/schema.sql>)
- Configure no Render:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- O frontend pega essas variaveis via `/api/public-config`.
- Cada usuario autenticado salva seu estado na tabela `user_states` com RLS (um usuario nao acessa dados do outro).

## Formato de importação Garmin/local

CSV ou JSON com campos:

```text
date,distance,duration,effort,feeling,notes
2026-05-19,6.2,34:10,5,bom,Treino leve
```

## Integração Garmin real

Este protótipo simula OAuth e exporta arquivos locais. Para sincronização real com Garmin Connect, o próximo passo é criar um backend aprovado no Garmin Connect Developer Program com:

- Activity API para importar atividades realizadas;
- Training API para publicar treinos estruturados e planos;
- OAuth para autorização do atleta;
- armazenamento seguro de tokens;
- endpoints para receber atividades e enviar treinos estruturados;
- geração de payload/FIT workout compatível com a API aprovada.

## Base de prescrição

A biblioteca de treinos foi alinhada com materiais públicos da Garmin sobre sessões-chave de corrida e fases de treinamento:

- longão, recovery, limiar, subida, fartlek, intervalado, ritmo de prova, aquecimento e desaquecimento;
- fases de base, força, velocidade, polimento para prova e recuperação;
- estrutura exportável com aquecimento, repetições, recuperação e desaquecimento, compatível com a lógica de treinos intervalados usada em relógios Garmin.
