# IA gratuita do AI VJ Generator (Cloudflare Worker)

O botão **Gerar briefing** funciona sem nada disto: ele gera pelas regras locais (`app/genai.js`), no navegador, sem enviar dados. Este Worker só liga a **IA gratuita opcional**, que completa o que a pessoa deixou em branco. Sem ele, a caixa "Usar IA gratuita" fica desativada e o assistente avisa.

## O que ele faz

- Esconde as chaves da Groq e do Gemini (segredos do Worker; o navegador nunca as vê).
- Limita a **14 gerações por dia** para o site inteiro (`DAILY_LIMIT`, zera às 00:00 UTC). Esgotado, responde `budget` e o navegador gera pelas regras locais.
- Texto pela **Groq** (JSON mode), imagens pelo **Gemini** (visão); cada um serve de reserva do outro.
- Só aceita `POST /` ou `/brief`, de origens autorizadas, com corpo até 1,5 MB e até 3 imagens JPEG, PNG ou WebP.
- Não registra descrição nem imagens. O navegador valida a resposta de novo antes de usar (`BRIEFGEN.sanitizeSpec`).

## Instalar (uma vez, grátis)

1. Crie uma conta na Cloudflare e instale o Wrangler: `npm i -g wrangler` (ou `npx wrangler`).
2. Crie chaves gratuitas: Groq (console.groq.com) e Gemini (aistudio.google.com). **Não vincule faturamento ao projeto do Gemini**: sem ele, estourar a cota deve resultar em erro, não em cobrança (confira nos termos do Google).
3. Na pasta `worker/`:
   ```
   npx wrangler kv namespace create BUDGET     # copie o id para wrangler.toml
   npx wrangler secret put GROQ_API_KEY
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
4. Copie a URL que o deploy mostrar (`https://ai-vj-generator-ia.SEU-USUARIO.workers.dev`) para a constante `ENDPOINT` em `app/briefgen.js`, e rode `node scripts/embed-modules.mjs && node scripts/sync-skill.mjs`.
5. Se o site não estiver em `gyulyia3d-cloud.github.io`, ajuste `ALLOWED_ORIGINS` em `wrangler.toml`.

## Instalar sem linha de comando, pelo GitHub (as chaves nunca passam pelo chat)

1. Crie a conta gratuita na Cloudflare (dash.cloudflare.com). Em **Workers & Pages > KV**, crie um namespace chamado `BUDGET` e cole o **id** dele em `wrangler.toml` (o id não é segredo).
2. Crie um **API Token** na Cloudflare (My Profile > API Tokens > modelo "Edit Cloudflare Workers"; confira que inclui KV) e copie o **Account ID** (página Workers & Pages).
3. No GitHub: **Settings > Secrets and variables > Actions > New repository secret**, quatro vezes:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GROQ_API_KEY`, `GEMINI_API_KEY`.
4. O workflow `.github/workflows/worker.yml` publica o Worker a cada alteração em `worker/` na `main`, ou ao clicar em **Actions > worker > Run workflow**. Ele grava as duas chaves como segredos do Worker. Sem os secrets da Cloudflare ele não faz nada.
5. Copie a URL do Worker (aparece nos logs do deploy e no painel da Cloudflare) para `ENDPOINT` em `app/briefgen.js`.

O workflow **não foi executado ainda** (não há como rodá-lo daqui): o primeiro deploy pode pedir ajustes, por exemplo nas permissões do token.

## Limites honestos

- Os nomes de modelo (`GROQ_MODEL`, `GEMINI_MODEL`) e as cotas dos planos gratuitos mudam; confira no console de cada serviço. Os valores de `wrangler.toml` são ponto de partida, **não foram testados contra as APIs reais**.
- O orçamento usa KV, que não é atômico: pode passar de 14 por uma ou duas gerações em acessos simultâneos. É um freio, não contabilidade.
- A checagem de origem não é segurança (qualquer programa forja o cabeçalho). A defesa real é o limite diário, o corpo pequeno e as rotas fixas.
- Origem `null` (abrir `app/index.html` por duplo clique) é aceita por padrão; defina `ALLOW_FILE_ORIGIN = "false"` para recusar.
- Sem login, quem chegar depois no dia fica sem IA. É a consequência de não ter conta nem custo.
