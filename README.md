# API Laudo Pneus — catálogos JSON

Versão 2.0: Node.js 22+ / Express / JavaScript ES Modules / Netlify Functions.
Os dados vêm exclusivamente de data/*.json. Não há MongoDB, Mongoose, conexão externa, seed ou credencial de banco.
As Functions continuam necessárias para manter os filtros pela URL e permanecem sujeitas aos limites do plano Netlify.

## Dados e compatibilidade

Preservados do catálogo publicado: 9 categorias/109 medidas, 3 marcas, 2 bandas Vipal e 6 pneus novos.
IDs e metadados existentes foram preservados. Avarias começam vazias: nenhum conteúdo técnico fictício foi adicionado.
Preços pertencem ao orçamento no app e são rejeitados nos arquivos de catálogo.

- data/medidas.json
- data/marcas.json
- data/bandas.json
- data/pneus.json
- data/avarias.json

Esses arquivos são a fonte oficial dos dados. Arquivos src/data/*.js apenas exportam essa mesma base.

## Executar

```sh
npm ci
npm start
```

Padrão: http://localhost:3003. Banco de dados não é necessário.
Opcional: .env com PORT, HOST, NODE_ENV e CORS_ORIGINS. npm start e npm run dev carregam esse arquivo.
MONGO_URI e ADMIN_API_KEY de uma configuração antiga não são lidos nesta versão.
Execute os comandos na raiz do projeto.

## Rotas mantidas

- GET /api/medidas — formato exato [{title,data:[{label,value}]}], ordem e grafia originais.
- GET /api/medidas?slug=agricola
- GET /api/medidas/buscar?busca=295
- GET /api/avarias?codigo=04&categoria=... (também busca)
- GET /api/marcas?nome=Continental (também categorias e busca)
- GET /api/bandas-vipal?codigo=VT110 (também nome, aplicacao, eixo, medidas e busca)
- GET /api/pneus-novos?fabricante=Continental&medida=295%2F80%20R22.5 (também modelo, aplicacao, eixo e busca)
- GET /api/bandas e /api/pneus — aliases compatíveis.
- GET /api/CATALOGO/:id — IDs existentes preservados.
- GET /health — {status:"ok"}
- GET /ready — {status:"ok",storage:"json"}

Filtros de catálogo são exatos, ignorando maiúsculas/minúsculas. busca usa substring literal.
Somente registros com ativo diferente de false são retornados.
Campos extras de query não são usados; valores repetidos ou não textuais em filtros conhecidos são rejeitados.
POST, PUT, PATCH e DELETE retornam 405: a API não grava alterações no filesystem do Netlify.
Não há atualização de dados durante uma requisição.

## Atualizar dados

Edite o arquivo correspondente em data/, valide e envie a alteração ao GitHub.
O novo deploy incorpora o JSON atualizado. Alterações locais exigem reiniciar npm start; npm run dev usa watch.
Para desativar um produto preservando o ID, use ativo:false.

Também é possível importar um array JSON revisado:

```sh
npm run import:catalogo -- pneus caminho/pneus.json --dry-run
npm run import:catalogo -- pneus caminho/pneus.json
npm run import:catalogo -- bandas caminho/bandas.json
```

Importação local faz upsert por slug/nome/codigo ou fabricante+modelo+medida, preservando IDs.
Novos registros recebem IDs estáveis; reexecutar o mesmo arquivo não duplica registros.
Os dados são validados antes de substituir o catálogo local.
Use o importador específico para avarias, pois ele também verifica imagens.

## Avarias Vipal e imagens

Use apenas dados transcritos/revisados do seu material e fotos autorizadas.
Copie imports/avaria.template.json, substitua todos os placeholders e preencha:
codigo, titulo, categoria, aparencia, causas (array), acao, precaucao,
fonte.nome, fonte.documento e fonte.pagina (página física do PDF, começando em 1).
Categoria deve ser conferida no documento, sem inferência por faixa numérica de código.

Coloque PNG/JPEG/WebP em uploads/avarias/04/principal.jpg.
No JSON: imagens:[{url:"/uploads/avarias/04/principal.jpg",descricao:"...",principal:true}].
No máximo uma principal. URLs HTTPS externas também são aceitas.

```sh
npm run extract:vipal -- caminho/guia.pdf caminho/texto.txt
npm run import:avarias -- caminho/avarias.json --dry-run
npm run import:avarias -- caminho/avarias.json
```

O extrator gera texto por página para revisão; não inventa registros nem associa imagens automaticamente.
PDFs sem camada de texto precisam de OCR/revisão manual.
O importador verifica arquivos locais e impede caminhos fora de uploads.

Build copia imagens para /uploads e /images. Mudanças nas fotos exigem novo deploy.
uploads é ignorado no Git por padrão; inclua explicitamente as imagens autorizadas:
git add -f uploads/avarias/04/principal.jpg

## Netlify e React Native

Veja NETLIFY.md. O netlify.toml mantém npm run build, public e netlify/functions.
NODE_ENV=production e CORS_ORIGINS são opcionais. MONGO_URI e ADMIN_API_KEY podem ser removidos do painel do Netlify.
A implantação não conecta ao Atlas. O banco anterior não é alterado nem excluído.

URL base do aplicativo: https://earnest-pudding-76ee22.netlify.app

```js
const response = await api.get('/api/medidas');
setTireSections(response.data);
const produtos = await api.get('/api/pneus-novos', {
  params: { fabricante: 'Continental', medida: '295/80 R22.5' }
});
```

As respostas e filtros GET permanecem compatíveis.
O build também publica JSON direto em /catalogos/medidas.json, marcas.json, bandas.json, pneus.json e avarias.json.
Esses arquivos diretos não aplicam filtros pela URL; para isso use /api/....

## Outra API como fonte

O aplicativo pode consumir esta API normalmente.
Se outra API fornecer os catálogos, importe o JSON revisado para data/ e publique.
Uma integração automática com API externa depende do endereço, contrato, autenticação e licença de dados dessa fonte; não foi inventada nesta versão.

## Validar

```sh
npm run check
npm test
npm run build
```

Testes verificam dados, filtros, IDs, leitura sem credenciais, escrita bloqueada, importação idempotente,
imagens e a Function empacotada em CommonJS com os JSON embutidos.
Fontes oficiais dos registros técnicos constam nos próprios dados; disponibilidade comercial deve ser confirmada com o fornecedor.
