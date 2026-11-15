# KJE VISUALS — Vercel + Supabase

## Nova loja de fotos e vídeos

Para ativar vendas por Pix com confirmação manual, siga **ATIVAR-LOJA.md**. A migração adicional fica em `supabase/loja.sql`; o painel da loja fica em `/admin/loja` e o catálogo em `/loja`.


O Supabase guarda o banco, as mídias enviadas e o login do painel. O site em si (páginas) roda na Vercel, porque o Supabase não hospeda sites.

## 1. Supabase
1. Crie um projeto em supabase.com.
2. **SQL Editor > New query**: cole `supabase/schema.sql` e clique em **Run**.
3. **Project Settings > API**: copie a **Project URL**, a chave **publishable/anon** e a chave **secret/service_role**. A secret nunca vai para o navegador nem para o GitHub.

## 2. Chave do painel
No terminal da pasta: `npm install` e depois `npm run chave`. Guarde o valor de `ADMIN_KEY` (arquivo `.env.local`) no gerenciador de senhas.

## 3. GitHub e Vercel
1. Suba a pasta para um repositório `kje-visuals` (o `.gitignore` já exclui `.env.local`).
2. Na Vercel: **Add New > Project**, importe o repositório (Framework: Other).
3. Em **Environment Variables**, cadastre as quatro: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (a secret), `SUPABASE_PUBLISHABLE_KEY` (a publishable) e `ADMIN_KEY`.
4. **Deploy**.

## 4. Teste
Abra o endereço da Vercel numa aba anônima e o `/admin`, cole a chave e envie uma foto pequena primeiro, depois um vídeo. Salve, veja a prévia e publique.

## Limites
- O código limita cada envio a 50 MB (15 MB para fotos no painel antigo). Confira armazenamento, tráfego e limites atuais no painel do seu plano Supabase.
- Os filmes que já vêm no projeto ficam na própria Vercel (pasta `public/assets`); só o que você enviar pelo painel vai para o Supabase.
- O conteúdo editado no painel antigo (Cloudflare/ChatGPT) não é copiado: refaça as edições no painel novo.
