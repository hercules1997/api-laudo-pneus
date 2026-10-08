# API Laudo Pneus

**Versão preparada para Netlify Functions.** Consulte [NETLIFY.md](NETLIFY.md) para publicar com MongoDB Atlas, variáveis e imagens estáticas.

Node.js 22+ / Express 5 / MongoDB / Mongoose / JavaScript ES Modules.
API de catálogos para o aplicativo de laudos. Não inclui emissão de laudos/PDF ou armazenamento de propostas. Preços pertencem ao orçamento digitado no app; campos como preco são rejeitados.

## Iniciar

1. Instale Node.js 22+ e disponibilize MongoDB local ou Atlas.
2. Na pasta api-laudo-pneus execute `npm ci`.
3. Copie .env.example para .env e configure MONGO_URI (MONGO_URL também é aceito).
4. Execute `npm run seed` e `npm start`.

Padrão http://localhost:3003. A API só inicia depois de conectar ao MongoDB.
GET /health verifica o processo; GET /ready verifica conexão ao banco.
npm run dev reinicia durante desenvolvimento.

## Rotas

- GET /api/medidas: formato exato [{title,data:[{label,value}]}], sem metadados.
- GET /api/medidas?slug=agricola
- GET /api/medidas/buscar?busca=295
- GET /api/avarias?codigo=04&categoria=... (também busca)
- GET /api/marcas?nome=Continental (também categorias, busca)
- GET /api/bandas-vipal?codigo=VT110 (também nome, aplicacao, eixo, medidas, busca)
- GET /api/pneus-novos?fabricante=Continental&medida=295%2F80%20R22.5 (também modelo, aplicacao, eixo, busca)
- /api/bandas e /api/pneus são aliases compatíveis.

Todos os catálogos: GET /:id, POST /, PUT /:id, PATCH /:id e DELETE /:id.
PUT e PATCH atualizam os campos enviados; DELETE desativa (ativo=false).
GET lista apenas ativos e retorna arrays; exceto medidas, inclui _id e timestamps.
Filtros são exatos e ignoram maiúsculas/minúsculas; busca é substring literal.
As strings de medida são preservadas, sem normalização silenciosa.
Erros: 400 validação, 401 credencial, 404 ausente, 409 duplicado, 503 banco/escrita indisponível.
Campos desconhecidos, operadores MongoDB e preços são rejeitados.

### Escrita administrativa

Defina ADMIN_API_KEY no .env e envie Authorization: Bearer SEU_SEGREDO.
Sem chave configurada, escrita retorna 503. Leitura é pública.
Não coloque a chave administrativa no React Native; use uma ferramenta administrativa ou servidor.
CORS_ORIGINS aceita origens web separadas por vírgula; vazio libera origens. Use HTTPS em produção.

## Dados incluídos

- Todas as 9 categorias e 109 medidas fornecidas pelo usuário, com ordem e grafia originais.
- Marcas Continental, Royal Black e Vipal.
- Bandas: catálogo inicial VT110 e VRT3; não representa toda a linha.
- Pneus Continental HSC1 em 295/80 R22.5 e 315/80 R22.5.
- Royal Black RS205 em 295/80 R22.5, 295/75 R22.5, 315/80 R22.5 e 285/75 R24.5.
- Índices técnicos Continental não foram inferidos.
- Avarias e imagens começam vazias: PDF e fotos não estavam disponíveis no projeto.
- Nenhum preço ou conteúdo técnico fictício foi incluído.

Fontes oficiais consultadas em 07/10/2026:
- https://vipal.com/pt/catalogo/renovado-de-pneus
- https://www.continental-reifen.de/products/truck/tires/hsc1/
- https://www.royalblacktyre.com/product_14_RS205.html

Catálogos podem variar por região; confirme disponibilidade comercial com o fornecedor.

## Seeds

`npm run seed` popula todos os catálogos. Comandos individuais:
`npm run seed:medidas`, `npm run seed:marcas`, `npm run seed:bandas`, `npm run seed:pneus`.

Upsert por slug/nome/codigo ou fabricante+modelo+medida, sem excluir registros existentes.
Reexecução atualiza as mesmas chaves, não duplica. Registros com outras chaves são preservados.
Os valores definidos no arquivo de seed substituem os do registro correspondente.
Cada lote é validado antes de gravar; não há transação global. Falhas de conexão podem aplicar parte do lote; reexecute.

Para ampliar catálogos com dados reais:
`npm run import:catalogo -- pneus caminho/pneus.json`
ou `npm run import:catalogo -- bandas caminho/bandas.json`.
O arquivo deve ser array de objetos dos respectivos models. Também aceita medidas e marcas.

## Avarias Vipal: importação local revisada

1. Use seu PDF e imagens autorizadas. Opcional: `npm run extract:vipal -- caminho/guia.pdf caminho/texto.txt`.
   Gera texto por página para revisão; não interpreta causas nem cadastra automaticamente.
   PDFs digitalizados precisam de OCR externo/revisão manual.
2. Copie imports/avaria.template.json para seu arquivo e substitua TODOS os placeholders pelo conteúdo real.
3. Preencha codigo, titulo, categoria, aparencia, causas (array), acao, precaucao e fonte com nome, documento/edição e pagina física do PDF iniciando em 1.
   A categoria deve ser conferida na edição do guia; não é deduzida de faixas de códigos.
4. Coloque PNG/JPEG/WebP em uploads/avarias/04/principal.jpg, por exemplo.
   No JSON use imagens:[{url:"/uploads/avarias/04/principal.jpg",descricao:"...",principal:true}].
   No máximo uma principal. URLs https também são aceitas sem download/validação remota.
5. `npm run import:avarias -- caminho/avarias.json --dry-run` valida sem banco.
6. `npm run import:avarias -- caminho/avarias.json` importa com upsert.

imports/avarias.json começa vazio. O template não é um dado técnico.
O importador verifica os arquivos locais e impede caminhos fora de uploads.
A extração/seleção das imagens do PDF é manual, para evitar associar fotos à avaria errada.
Não há endpoint multipart: coloque fotos no diretório ou use armazenamento externo.
GET /uploads/avarias/04/principal.jpg serve a foto; /images é alias de /uploads.

## React Native

```js
const response = await api.get('/api/medidas');
setTireSections(response.data);
const produtos = await api.get('/api/pneus-novos', {
  params: { fabricante: 'Continental', medida: '295/80 R22.5' }
});
const foto = avaria.imagens[0]?.url;
const uri = foto?.startsWith('/') ? API_BASE_URL + foto : foto;
```

Em dispositivo físico, use o IP/host acessível da API; localhost aponta para o dispositivo.
Android Emulator geralmente usa http://10.0.2.2:3003.
Valor unitário e quantidade continuam na proposta.

## Validação e publicação

`npm run check` verifica sintaxe e imports. `npm test` verifica endpoints reais, CRUD, filtros,
seeds idempotentes e formato React Native com MongoDB temporário em porta aleatória.
O primeiro teste pode baixar binário MongoDB (requer rede); não modifica banco do usuário.

Em produção configure MONGO_URI, NODE_ENV=production, PORT e ADMIN_API_KEY.
No Netlify, o build publica imagens de uploads como arquivos estáticos; alterações exigem novo deploy. Em outros hosts use volume persistente ou URLs externas.
Não versionar .env ou credenciais. package-lock.json garante instalação reproduzível.
O ZIP contém código, dados, documentação e testes, sem node_modules.
