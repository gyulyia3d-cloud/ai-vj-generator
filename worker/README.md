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

## Limites honestos

- Os nomes de modelo (`GROQ_MODEL`, `GEMINI_MODEL`) e as cotas dos planos gratuitos mudam; confira no console de cada serviço. Os valores de `wrangler.toml` são ponto de partida, **não foram testados contra as APIs reais**.
- O orçamento usa KV, que não é atômico: pode passar de 14 por uma ou duas gerações em acessos simultâneos. É um freio, não contabilidade.
- A checagem de origem não é segurança (qualquer programa forja o cabeçalho). A defesa real é o limite diário, o corpo pequeno e as rotas fixas.
- Origem `null` (abrir `app/index.html` por duplo clique) é aceita por padrão; defina `ALLOW_FILE_ORIGIN = "false"` para recusar.
- Sem login, quem chegar depois no dia fica sem IA. É a consequência de não ter conta nem custo.
