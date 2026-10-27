# G&I Central | CRM da G&I Agência

Aplicativo de gestão da **G&I Agência**, com clientes, propostas, projetos, tarefas, financeiro e galeria de artes no Google Drive.

## Tecnologias
- Frontend em HTML, CSS e JavaScript (sem build framework).
- Vercel Serverless Functions em Node.js para autenticação com Google.
- Google Sheets para sincronizar dados do CRM.
- Google Drive para os arquivos e artes de cada cliente.
- Progressive Web App (PWA) instalável no Android.

## Estrutura
- `index.html`: telas, estilos e lógica do CRM.
- `api/auth.js`: autenticação Google, allowlist e sessão protegida.
- `api/config.js`: configuração pública para o navegador.
- `app.webmanifest`, `sw.js`, `offline.html`: PWA e tela offline.
- `icons/`: ícones oficiais da G&I Agência.
- `vercel.json`: configuração de hospedagem.
- `.env.example`: nomes das variáveis necessárias (sem segredos).

## Deploy na Vercel
1. Importe este repositório para o projeto Vercel `agencia_gi_adm` (ou vincule o projeto existente).
2. **Root Directory**: diretório raiz do repositório. **Framework Preset**: Other. Não configure `src` como raiz.
3. Em **Environment Variables**, configure os valores privados conforme `.env.example`. Não salve segredos reais no GitHub.
4. Publique apenas após revisar todas as alterações, usando **um deploy por atualização**.

## Instalando no Android
Abra o endereço publicado no Chrome do Android e selecione **Instalar app** (ou **Adicionar à tela inicial**).

## Segurança
Este repositório não armazena planilhas exportadas, dados de clientes, tokens nem senhas. O acesso real depende das credenciais configuradas diretamente na Vercel e das permissões Google. Acesso offline não substitui autenticação ou sincronização.

> Código recuperado da versão do G&I Central publicada em 23/10/2026 e reorganizado para versionamento Git e deploy na raiz.

## Recebimento de arquivos sem login do cliente

Na área **Clientes**, clique em **Link de envio** ao lado do cliente cadastrado. O CRM cria ou recupera a pasta exclusiva desse cliente e permite gerar um link com validade de 1, 7, 15 ou 30 dias. O cliente abre a página `/enviar/?t=...` e envia seus arquivos sem conta Google nem login no CRM. A integração salva os arquivos diretamente na **pasta privada** do cliente no Drive. O painel **Artes** agora mostra imagens e também PDFs, documentos, vídeos e ZIPs, com botão **Atualizar**.

Limites: até **10 GB por arquivo** e 10 arquivos selecionados por lote na página. São aceitos mais de 80 formatos: MP4, MOV (inclusive ProRes), MKV, WEBM, MXF, MTS/M2TS, AVI, BRAW, R3D, JPG, PNG, HEIC, RAW (CR2, CR3, NEF, ARW, DNG, RAF e outros), PSD, PSB, AI, EPS, TIFF, WAV, FLAC, MP3, arquivos Office, PDF, ZIP, RAR, 7Z, projetos PRPROJ, AEP, DRP, DRB, VEG, BLEND e outros. Executáveis e scripts não são aceitos. A transferência usa blocos de **4 MiB** via backend (abaixo do limite de requisição de 4,5 MB da Vercel) e Google Drive resumable uploads. Em quedas temporárias, o navegador consulta o progresso no Google Drive e tenta continuar de onde parou. Também é possível pausar e retomar enquanto a aba permanecer aberta. O cliente deve manter a aba aberta para arquivos grandes, pois fechar ou atualizar a página interrompe o envio. As sessões assinadas duram até 24 h (e nunca além do vencimento do link). Nenhuma credencial Google OAuth é entregue ao cliente. Os links funcionam até vencerem e são confidenciais: qualquer pessoa com o link pode enviar, mas não consultar nem excluir os arquivos da pasta.

### Configuração indispensável no projeto Vercel

O login atual do CRM usa autorização Google no navegador, que **não serve para receber arquivos quando o administrador está desconectado**. Para isso, o backend precisa da autorização permanente da conta proprietária do Drive. Configure as variáveis abaixo em **Vercel > Settings > Environment Variables** (produção e, se desejado, preview):

- `GOOGLE_CLIENT_ID`: o ID OAuth já usado pelo CRM.
- `GOOGLE_CLIENT_SECRET`: o segredo do mesmo cliente OAuth.
- `GI_DRIVE_REFRESH_TOKEN`: refresh token OAuth da conta que controla a pasta de clientes, com escopo `https://www.googleapis.com/auth/drive`.
- `GI_SESSION_SECRET` e `GI_ALLOWED_EMAILS`: já usados para proteger o administrador e a geração de links.
- `GI_UPLOADS_PARENT_FOLDER_ID` (opcional): ID da pasta-mãe das pastas de clientes; padrão `1XNm3H5jIehlIzaXGYG5KDJgSgn72Q9Rq`.

Para obter o refresh token, use uma autorização OAuth 2.0 com **acesso offline** (`access_type=offline`, `prompt=consent`) e o escopo `https://www.googleapis.com/auth/drive`. Em alternativa, use o Google OAuth 2.0 Playground, configure a opção **Use your own OAuth credentials** com as credenciais do mesmo cliente, cadastre `https://developers.google.com/oauthplayground` como redirect URI autorizado, conceda o escopo do Drive e troque o código OAuth por tokens. Copie o refresh token **diretamente para as variáveis secretas da Vercel**, nunca para o GitHub ou chat. É possível remover a URI de callback do Playground depois.

Depois de salvar essas variáveis, uma nova publicação da Vercel poderá ser necessária para aplicar o ambiente. O botão **Link de envio** informará quando essa configuração ainda não estiver pronta. Teste com um arquivo pequeno antes de compartilhar links.

### Segurança e observações

O administrador precisa estar autenticado no G&I Central para gerar links. O backend verifica se a pasta pertence à pasta-mãe permitida, assina os links com HMAC e não expõe permissões, arquivos ou URLs do Drive. Os arquivos ficam privados, vinculados à pasta do cliente. Um link pode ser compartilhado ou reenviado por quem o possui; não é um mecanismo de autenticação e não há revogação individual antecipada nesta versão. Para novas campanhas, use prazos curtos. Como qualquer endpoint público, recomenda-se um serviço de proteção contra abuso e cotas de requisições em produção. O provedor Vercel pode cobrar ou limitar o tráfego de upload.

### Vídeos 4K e custos de tráfego

O sistema aceita arquivos de vídeo **independentemente da resolução**; a compatibilidade depende do formato do arquivo (extensão), não dos pixels. O limite atual é **10 GB por arquivo**; arquivos acima disso precisam ser divididos ou enviados por outro método. Como os arquivos passam por uma função da Vercel a caminho do Google Drive, um upload de vários gigabytes também consome banda, requisições e capacidade do plano na Vercel e espaço na conta Google. Não há proteção por quota de volume por link ou antivírus adicional no servidor: compartilhe os links apenas com seus clientes de confiança e use validade curta. Para arquivos muito maiores, considere um fluxo direto de transferência para armazenamento especializado.
