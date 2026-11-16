# KJE VISUALS — nova interface (3.0)

Esta versão atualiza o visual do site e da loja que já usam Vercel e Supabase.

## O que mudou

- Página inicial com títulos pesados, menos texto e suas mídias em destaque.
- Botão Loja fixo no cabeçalho, inclusive no celular.
- Menu de loja na página inicial: Tudo, Fotos, Vídeos e Meus pedidos.
- Até três produtos reais exibidos na página inicial quando a loja está aberta.
- Galeria com imagens maiores, filtros e reprodutor preservados.
- Catálogo, seleção, pedido e painel com a mesma identidade visual.
- Fontes locais incluídas, sem depender do Google Fonts.

## Atualizar o site já publicado

1. Extraia o ZIP. Abra a pasta `KJE-Visuals-Supabase`.
2. Copie o conteúdo dela para a pasta local que já está ligada ao seu repositório `kje-visuals`. Mescle as pastas e substitua os arquivos correspondentes. Não coloque uma pasta inteira dentro da outra.
3. Preserve a pasta `.git`, seu `.env.local` e as variáveis da Vercel. Inclua os novos arquivos `public/design.css`, `public/home-shop.js` e toda a pasta `public/assets/fonts`.
4. No terminal, dentro da pasta ligada ao GitHub, execute:

```sh
npm ci
npm run verificar
npm test
git status
git add .
git diff --cached --stat
git commit -m "Atualiza interface do portfolio e da loja"
git push origin main
```

Os comandos consideram a branch `main`, mostrada no seu repositório. Confira os arquivos listados antes do commit. Se a Vercel já estiver configurada para publicar essa branch, acompanhe o novo deploy e confira a página inicial, `/loja` e `/pedido`.

**Esta atualização visual não exige SQL novo.** Se a loja da versão anterior ainda não foi ativada, siga `ATIVAR-LOJA.md` para configurar a estrutura e o Pix. O portfólio continua disponível enquanto a loja está em preparação.

## Conteúdo e funcionamento

- Produtos, preços, licenças e disponibilidade continuam sendo gerenciados em `/admin/loja`.
- A nova página inicial consulta o catálogo real. Não há preços nem produtos fictícios incluídos no site de produção.
- A imagem do botão Fotos pode ser alterada em `/admin` → Abertura e acervo. Esse campo reutiliza a antiga foto da seção “O olhar”.
- O botão Vídeos usa a capa de um trabalho visível do portfólio; os produtos da loja continuam independentes desses trabalhos.
- Pagamento por Pix continua com confirmação manual. Os downloads continuam restritos aos pedidos liberados.
- O banco, os originais privados, as configurações da loja e o histórico de pedidos não foram alterados.

## Validação desta versão

- Verificação TypeScript aprovada.
- 12 testes existentes da loja aprovados.
- Navegação, menu móvel, filtros, ligação direta com produtos, seleção e criação de pedido conferidos no navegador em ambiente local.
- Layout conferido em tela de computador e em largura de celular, com correção do transbordamento de texto.
- A prévia de avaliação usa catálogo e valores ilustrativos, isolados do pacote de produção. Nenhum pagamento real ou publicação no seu site foi realizado.
