# Validação — versão JSON

Validado em 09/10/2026: sintaxe/imports OK, 9 testes aprovados, 0 falhas; build aprovado.
Dados preservados do Atlas: 9 categorias, 109 medidas, 3 marcas, 2 bandas, 6 pneus, avarias vazias.
Testes incluem filtros, IDs, endpoints de leitura, HTTP 405 na escrita, importador idempotente e Function CommonJS com os JSON embutidos.
MONGO_URI inválida nos testes confirma que a API não depende de conexão ao banco.
