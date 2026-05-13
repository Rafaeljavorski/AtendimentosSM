# Dashboard Atendimentos + API protegida + GitHub

Essa versão salva os dados no GitHub usando uma API Node.js.

## Arquivos

- `public/index.html` = dashboard
- `server.js` = API protegida
- `data/dados_atendimentos.json` = base inicial
- `.env.example` = exemplo de configuração

## Como funciona

Dashboard -> API protegida -> GitHub

O token do GitHub fica no servidor, não aparece no HTML.

## Rodar local

```bash
npm install
npm start
```

Abra:

```text
http://localhost:3000
```

## Variáveis de ambiente

```text
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
GITHUB_DATA_PATH
PORT
```

## Uso no dashboard

- Importe as planilhas
- Clique em `Salvar no GitHub`
- Em outro computador, abra o dashboard e clique em `Carregar GitHub`
