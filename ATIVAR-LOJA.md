# KJE VISUALS — ativar a loja de fotos e vídeos

A atualização acrescenta uma loja ao site atual na Vercel + Supabase. O portfólio e o painel de conteúdo permanecem disponíveis. Nenhuma publicação ou alteração no seu banco real foi feita durante a preparação deste pacote.

## 1. Credenciais

O ZIP recebido continha credenciais preenchidas em `.env.example`. A versão entregue contém somente exemplos. Troque a chave secreta do Supabase e a chave `ADMIN_KEY` se o arquivo foi compartilhado ou enviado ao GitHub. Atualize as variáveis da hospedagem com as novas chaves. Não publique chaves reais em arquivos do repositório.

Mantenha as quatro variáveis já usadas pelo site na Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` e `ADMIN_KEY`. Não é necessário contratar ou configurar um intermediador de pagamento para este fluxo manual.

## 2. Criar a estrutura da loja

1. Abra o projeto Supabase que seu site já utiliza.
2. No **SQL Editor**, abra uma nova consulta.
3. Cole todo o conteúdo de **`supabase/loja.sql`** e execute.
4. A consulta cria três tabelas e dois buckets privados separados do portfólio. Não apaga os dados existentes.
5. Se estiver instalando o site do zero, execute primeiro `supabase/schema.sql`, depois `supabase/loja.sql`.

Não torne `shop-originals` público nem crie políticas de leitura pública para esse bucket. Não remova arquivos originais já vendidos: pedidos anteriores apontam para a versão comprada.

## 3. Atualizar os arquivos do site

Substitua os arquivos do seu projeto pelo conteúdo da pasta deste ZIP e envie ao repositório conectado à Vercel. Preserve seu `.env.local` real apenas na sua máquina. O ZIP não inclui `.git`, dependências instaladas, credenciais reais ou arquivos de teste temporários.

Em uma instalação local, execute:

```sh
npm install
npm run verificar
npm test
```

Depois faça o deploy na hospedagem atual. Não troque o projeto Supabase ou a hospedagem por causa desta atualização.

## 4. Configurar o recebimento

1. Entre em **`/admin`** usando sua chave habitual.
2. Clique em **Loja e pedidos**, ou abra **`/admin/loja`**.
3. Abra **Configuração do Pix**.
4. Informe a chave Pix e o favorecido exatamente como aparecem no banco.
5. Opcionalmente informe o WhatsApp com código do país, DDD e número, só dígitos (ex.: 55 + DDD + número).
6. Ajuste as instruções e o prazo esperado para conferência no texto apresentado ao cliente.
7. Salve. Deixe a loja pausada enquanto cadastra seus primeiros arquivos.

## 5. Cadastrar produtos

Em **Produtos → Adicionar produto**, preencha título, preço, categoria, especificações e licença. A licença é obrigatória: descreva os usos permitidos e as restrições que você deseja oferecer. Não foram inventadas licenças ou preços para seus arquivos.

### Fotos

Envie o original (JPG, PNG ou WebP, até 50 MB). O painel gera uma prévia JPEG de até 1.200 pixels com marca d’água gravada na imagem. O original é enviado para um bucket privado separado e preservado sem alterações.

### Vídeos

Envie três arquivos: o MP4 original, uma prévia MP4 e uma imagem de capa. Exporte a prévia previamente no seu editor, curta, reduzida e **com marca d’água incorporada ao vídeo**. A capa recebe marca d’água automaticamente no painel. Cada arquivo tem limite de 50 MB nesta implementação; para vídeos maiores, é necessário ampliar o plano/limites e adaptar os validadores e a configuração dos buckets antes do envio.

A loja não converte nem comprime vídeos automaticamente. Visitantes podem salvar qualquer prévia pública. Não use seu original como prévia, no hero ou na galeria pública se quiser vendê-lo com acesso reservado. Arquivos já presentes em `public/assets` ou publicados no portfólio continuam públicos; adicioná-los à loja não revoga cópias ou links anteriores.

Marque **Disponível na loja** e salve. Os produtos da loja são independentes dos trabalhos do portfólio. A loja não tem uma etapa de rascunho: salvar aplica a alteração imediatamente. Desmarcar a disponibilidade pausa novas vendas e preserva compras anteriores. A interface lista até 500 produtos; para um acervo maior, adicione paginação de produtos.

## 6. Testar e abrir

Após cadastrar os produtos, marque **Abrir a loja para novos pedidos** na configuração. Acesse `/loja` em uma janela anônima e faça um pedido de teste, sem transferir dinheiro. Copie o link do pedido. Entre no painel e confirme **somente esse pedido de teste** para conferir o download. Em seguida, revogue o acesso do teste. Não marque pedidos reais como pagos antes de conferir o recebimento no banco.

## 7. Fluxo real de venda

1. O cliente seleciona até 20 arquivos, informa nome e e-mail, aceita as licenças e faz o pedido.
2. A página mostra chave Pix, valor, favorecido e link privado do pedido. O cliente copia a chave e informa o valor no aplicativo do banco. Não há QR Code nem Pix Copia e Cola de cobrança nesta versão: o botão copia a **chave Pix**.
3. O pedido vale por 48 horas. O cliente deve guardar seu link privado, que também fica salvo neste navegador quando o armazenamento local está disponível. Não há envio automático por e-mail ou conta de cliente com senha.
4. Você confere o crédito e os dados da compra no aplicativo do banco. Em **Pedidos**, clique em **Confirmar pagamento** e confirme a ação.
5. A página do cliente verifica a situação a cada 30 segundos enquanto aberta; também há botão de atualização. Os downloads passam a aparecer após a liberação.
6. Cada clique gera um endereço temporário de 60 segundos. O link permanente de acompanhamento permite gerar novos downloads enquanto o pedido estiver pago.

O sistema não consulta seu extrato, não identifica pagamentos automaticamente e não faz estorno. Em pedidos expirados que já foram pagos, confira o caso e combine a resolução com o comprador antes de orientar um novo pedido ou pagamento. O painel não confirma pedidos expirados.

## 8. Operação diária

- **Pausar a loja:** interrompe novas compras; pedidos existentes ainda podem ser acompanhados e os pagos continuam com download.
- **Editar preço/arquivo/licença:** só afeta novas compras. Pedidos anteriores preservam seu valor, licença, dados Pix e arquivo original.
- **Cancelar:** disponível para pedidos ainda não pagos, inclusive expirados.
- **Revogar downloads:** bloqueia novos links de um pedido pago. URLs já emitidas duram até um minuto e arquivos já baixados não podem ser recolhidos. Devoluções de Pix são feitas separadamente no banco.
- **Recuperar acesso:** cria um novo link privado e invalida o anterior. Confira a identidade do comprador e envie você mesmo o novo link. O site não envia mensagens automaticamente.
- **Proteger o acesso:** o link do pedido funciona como uma senha. Quem o recebe pode acessar aquele pedido. Não publique o link e não o inclua em serviços de análise.
- **Conferir uploads:** envios interrompidos ou produtos abandonados podem deixar arquivos sem uso. Não há limpeza automática. Antes de remover qualquer arquivo, confira produtos e pedidos antigos; nunca apague originais vendidos.

## Validação realizada

- TypeScript e sintaxe dos scripts verificados.
- 12 testes automatizados, incluindo execução da migração em PostgreSQL local via PGlite, idempotência, preços, snapshots, bloqueio de compra de itens indisponíveis, limite por hora, RLS, acesso administrativo, confirmação e autorização de downloads.
- Fluxo visual verificado no navegador com dados fictícios: catálogo, filtro, seleção, criação do pedido, confirmação no painel e download após a liberação.
- Os testes usam dados fictícios e não acessam o seu Supabase, seu banco ou sua hospedagem reais.
- O funcionamento final de uploads, URLs assinadas, sessão HTTPS e publicação deve ser confirmado no seu projeto configurado. Nenhum pagamento real foi realizado.

Referências técnicas: [buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals), [uploads assinados](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl), [downloads assinados](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl).
