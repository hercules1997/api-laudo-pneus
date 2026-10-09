# Netlify — API baseada em JSON

1. Envie o projeto ao repositório conectado.
2. Mantenha Build command: npm run build; Publish directory: public; Functions: netlify/functions; Node.js 22.
3. Se o projeto estiver numa subpasta do repositório, configure essa pasta como Base directory.
4. Banco, MONGO_URI, ADMIN_API_KEY e seeds não são necessários. Variáveis antigas são ignoradas e podem ser removidas do painel.
5. NODE_ENV=production e CORS_ORIGINS são opcionais.
6. Após o deploy, /ready deve retornar {"status":"ok","storage":"json"}.

Os catálogos são importados de data/*.json e embutidos no bundle da Function.
As URLs /api/... mantêm filtros e detalhes por ID. Functions continuam consumindo a cota do plano Netlify.
JSONs sem filtros também estão disponíveis em /catalogos/*.json como arquivos estáticos.

## Atualizar

Edite data/*.json ou execute o importador local; valide com npm run check e npm test;
envie a alteração ao GitHub. O deploy usa os novos arquivos.

Não tente editar arquivos public/ diretamente: o build recria essa pasta.
Fotos têm origem em uploads/ e são copiadas para public/uploads e public/images.
Não há upload persistente em tempo de execução.

## Verificar

- https://earnest-pudding-76ee22.netlify.app/health
- https://earnest-pudding-76ee22.netlify.app/ready
- https://earnest-pudding-76ee22.netlify.app/api/medidas
- https://earnest-pudding-76ee22.netlify.app/api/pneus-novos?fabricante=Continental
- https://earnest-pudding-76ee22.netlify.app/catalogos/medidas.json

A base React Native permanece https://earnest-pudding-76ee22.netlify.app.
POST/PUT/PATCH/DELETE retornam 405; alterações são feitas nos JSONs do projeto e publicadas.

O banco anterior no Atlas foi preservado. Não é necessário mantê-lo ativo para essa versão funcionar.
