# Publicar no Netlify

Esta versão usa Netlify Functions para executar Express e MongoDB Atlas para armazenar os catálogos.
O projeto continua funcionando localmente com npm start.

## 1. Prepare o MongoDB Atlas

Crie um cluster, um usuário do banco e copie a conexão mongodb+srv com o nome do banco api-laudo-pneus.
No Atlas, configure Network Access para permitir a conexão das Functions do Netlify.
Credenciais ou acesso de rede incorretos fazem /ready retornar 503.

No .env local, configure a mesma MONGO_URI do Atlas. Popule esse banco a partir do computador:

```sh
npm ci
npm run seed
```

Importe também suas avarias e demais dados revisados, conforme README.md.
O deploy não executa seeds automaticamente e não precisa acessar o banco durante o build.

## 2. Publique o código

Extraia o ZIP e envie o conteúdo da pasta api-laudo-pneus para um repositório Git.
No Netlify, importe esse repositório como projeto. A configuração netlify.toml já define:

- Build command: npm run build
- Publish directory: public
- Functions directory: netlify/functions
- Node.js: 22

Se api-laudo-pneus estiver dentro de outra pasta do repositório, configure essa pasta como Base directory.
Não use npm start como comando de build.
Para esta API, use integração Git ou Netlify CLI: arrastar o ZIP de código ao painel de deploy estático não compila as Functions.

Como alternativa via CLI, depois de instalar e autenticar a Netlify CLI:

```sh
netlify init
netlify deploy --build
netlify deploy --build --prod
```

## 3. Configure variáveis no Netlify antes do deploy

Nas Environment variables do projeto, cadastre:

- MONGO_URI: conexão completa do Atlas, incluindo nome do banco e credenciais.
- ADMIN_API_KEY: segredo administrativo se precisar usar POST/PUT/PATCH/DELETE.
- NODE_ENV: production.
- CORS_ORIGINS: opcional, origens do frontend web separadas por vírgula.

As variáveis precisam estar disponíveis para Functions e para o contexto de deploy escolhido.
Configure-as no painel/CLI do Netlify, não dentro de netlify.toml.
Não envie .env ao Git e não coloque a chave administrativa no aplicativo React Native.
Após mudar variáveis, faça um novo deploy para garantir a aplicação da configuração.
PORT não é necessário no Netlify.

## 4. Verifique

Abra:

- https://SEU-SITE.netlify.app/health — processo ativo, sem exigir conexão.
- https://SEU-SITE.netlify.app/ready — banco conectado.
- https://SEU-SITE.netlify.app/api/medidas — nove seções após executar o seed no Atlas.
- https://SEU-SITE.netlify.app/api/pneus-novos?fabricante=Continental

No React Native configure API_BASE_URL como https://SEU-SITE.netlify.app.
Os caminhos /api/... permanecem iguais. /health pode funcionar mesmo que o Atlas esteja indisponível.

## Imagens e importações

O build copia arquivos PNG/JPEG/WebP de uploads para public/uploads e public/images.
Essas fotos são publicadas como arquivos estáticos. Para adicionar ou trocar fotos, atualize os arquivos no projeto e faça novo deploy.
Se publicar via Git, force a inclusão dos arquivos desejados em uploads, pois o .gitignore original protege imagens locais:

```sh
git add -f uploads/avarias/04/principal.jpg
```

Ou use URLs HTTPS de armazenamento externo no campo imagens.
As Functions não gravam uploads persistentes no filesystem. Seeds e importações locais são executados no computador contra o Atlas.
A pasta public é saída gerada e é recriada pelo build; não coloque arquivos de origem nela.

## Validação

```sh
npm run check
npm test
npm run build
```

Os testes incluem o adaptador Netlify, caminhos reescritos, conexão reutilizada e o servidor local.
A publicação real depende da sua conta Netlify e das credenciais Atlas; não foi realizada nesta entrega.

Referências:

- https://docs.netlify.com/build/frameworks/framework-setup-guides/express/
- https://docs.netlify.com/build/functions/environment-variables/
- https://mongoosejs.com/docs/lambda.html
