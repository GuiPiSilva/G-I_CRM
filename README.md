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
