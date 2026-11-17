# IA gratuita do AI VJ Generator (Cloudflare Worker)

O botão **Gerar briefing** funciona sem nada disto: ele gera pelas regras locais (`app/genai.js`), no navegador, sem enviar dados. Este Worker só liga a **IA gratuita opcional**, que completa o que a pessoa deixou em branco. Sem ele, a caixa "Usar IA gratuita" fica desativada e o assistente avisa.

## O que ele faz

- Esconde as chaves da Groq e do Gemini (segredos do Worker; o navegador nunca as vê).
- Limita a **14 tentativas de geração por dia** para o site inteiro (`DAILY_LIMIT`, zera às 00:00 UTC). Esgotado, responde `budget` e o navegador gera pelas regras locais.
- Texto pela **Groq** (JSON mode), imagens pelo **Gemini** (visão); cada um serve de reserva do outro.
- Só aceita `POST /` ou `/brief`, de origens autorizadas, com corpo até 1,5 MB e até 3 imagens JPEG, PNG ou WebP.
- Não registra descrição nem imagens. O navegador valida a resposta de novo antes de usar (`BRIEFGEN.sanitizeSpec`).

## Instalar (uma vez, grátis)

1. Crie uma conta na Cloudflare e instale o Wrangler: `npm i -g wrangler` (ou `npx wrangler`).
2. Crie chaves gratuitas: Groq (console.groq.com) e Gemini (aistudio.google.com). **Não vincule faturamento ao projeto do Gemini**: sem ele, estourar a cota deve resultar em erro, não em cobrança (confira nos termos do Google).
3. Na pasta `worker/`:
   ```
   npx wrangler secret put GROQ_API_KEY
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
4. Copie a URL que o deploy mostrar (`https://ai-vj-generator-ia.SEU-USUARIO.workers.dev`) para a constante `ENDPOINT` em `app/briefgen.js`, e rode `node scripts/embed-modules.mjs && node scripts/sync-skill.mjs`.
5. Se o site não estiver em `gyulyia3d-cloud.github.io`, ajuste `ALLOWED_ORIGINS` em `wrangler.toml`.

## Instalar sem linha de comando, pelo GitHub (as chaves nunca passam pelo chat)

1. Crie a conta na Cloudflare. O deploy cria o Durable Object definido no `wrangler.toml`.
2. Crie um **API Token** na Cloudflare (My Profile > API Tokens > modelo "Edit Cloudflare Workers") e copie o **Account ID** (página Workers & Pages).
3. No GitHub: **Settings > Secrets and variables > Actions > New repository secret**, quatro vezes:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GROQ_API_KEY`, `GEMINI_API_KEY`.
4. O workflow `.github/workflows/worker.yml` publica o Worker a cada alteração em `worker/` na `main`, ou ao clicar em **Actions > worker > Run workflow**. Ele grava as duas chaves como segredos do Worker. Sem os secrets da Cloudflare ele não faz nada.
5. Copie a URL do Worker (aparece nos logs do deploy e no painel da Cloudflare) para `ENDPOINT` em `app/briefgen.js`.

Ao migrar do Workers KV, a primeira publicação começa com um contador novo. O deploy aplica a migração declarada no `wrangler.toml`.

## Limites honestos

- Os nomes de modelo (`GROQ_MODEL`, `GEMINI_MODEL`) e as cotas dos planos gratuitos mudam: o `gemini-2.5-flash` deu 404 numa chave nova (a documentação diz que ele só atende quem já o usou), por isso o padrão é `gemini-3.5-flash-lite` (lista em ai.google.dev/gemini-api/docs/models); confira no console de cada serviço. Os valores de `wrangler.toml` são ponto de partida, **não foram testados contra as APIs reais**.
- Um Durable Object mantém a cota diária compartilhada. Erros do provedor contam como tentativa. A limitação de borda aplica 5 pedidos por IP por minuto em cada local da Cloudflare.
- A lista de origens controla o acesso pelo navegador. A cota diária compartilhada e a limitação de borda protegem o acesso público aos provedores.
- Ao abrir o HTML por duplo clique, o motor gera pelas regras locais. Para a IA gratuita, abra uma das versões web autorizadas.
- Sem login, quem chegar depois no dia fica sem IA. É a consequência de não ter conta nem custo.
