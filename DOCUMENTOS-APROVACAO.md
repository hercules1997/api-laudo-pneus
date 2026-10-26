# Documentos privados e aprovação

A configuração publicada utiliza Neon para contas, metadados e histórico, e armazenamento S3 privado para PDFs/fotos. Sincronização e aprovação estão ativas. O aplicativo consulta /api/documentos/capabilities: gerar e visualizar PDFs é permitido; compartilhar exige aprovação da versão atual. Consulte NEON-CONFIG.md.

## Adaptador legado sem banco

O adaptador `githubDocumentStorage.js` permanece disponível como implementação anterior, mas não é usado na configuração publicada. Ele utiliza o repositório privado configurado em AUTH_GITHUB_REPO; DOCUMENTS_GITHUB_REPO permite escolher outro repositório privado acessível ao token.

- `documents/index.json`: documentos, autor, estado, revisões, versões anteriores, atribuições a gestores e eventos futuros de notificação.
- `documents/pdfs/{ownerId}/{documentId}/v{version}/{sha256}.pdf`: PDFs privados imutáveis, separados dos metadados.

O token continua somente no Netlify. O app não recebe acesso ao GitHub. O servidor confere privacidade do repositório e identidade em cada operação protegida.

Limites desta implementação para equipe pequena: 4 MB por PDF, índice JSON até 750 KB, upload JSON até 6 MB. Falhas ou conflitos retornam erro; não sobrescrevem silenciosamente alterações de outra sessão. O GitHub possui cotas próprias de API e tamanho. O histórico Git retém versões: apagar um arquivo não remove cópias de commits anteriores. Uma futura migração de armazenamento poderá substituir apenas os adaptadores.

## Perfis e estados

Administrador gerencia contas e distribuição; consultor cria seus documentos; gestor analisa documentos enviados, incluindo múltiplos gestores. A autoria é obtida da sessão, nunca do campo ownerId enviado pelo cliente. Um autor não aprova seu próprio documento.

Estados: rascunho, pendente, aprovado, reprovado, reenviado. Editar gera uma nova versão em rascunho, preservando os dados e PDF da versão anterior. A primeira decisão válida de gestor autorizado basta. Revisão esperada e compare-and-swap impedem duas decisões conflitantes. Reprovação exige justificativa.

Para propostas, o gestor da unidade só consulta versões oficialmente enviadas: rascunhos ficam ocultos na listagem, nos detalhes e no acesso ao PDF. O consultor só edita e exclui suas propostas em rascunho ou reprovadas; pendentes, reenviadas e aprovadas ficam bloqueadas. Após corrigir uma reprovação, deve reenviar a nova versão. O gestor pode aprovar, recusar com justificativa e excluir propostas enviadas de sua unidade. A exclusão usa revisão esperada e registra deletedAt, deletedBy e ação deleted no histórico; as listas, PDFs e links de compartilhamento deixam de disponibilizar o documento, sem apagar a auditoria.

## Contrato disponível na mesma API

Todas as rotas abaixo exigem Bearer token, exceto o link temporário de compartilhamento:

- GET /api/documentos/capabilities
- GET /api/documentos?ownerId=&type=&status=&from=&to=
- POST /api/documentos: type, payload
- GET /api/documentos/:id
- PATCH /api/documentos/:id: payload, expectedRevision
- DELETE /api/documentos/:id: expectedRevision (propostas; exclusão lógica)
- POST /api/documentos/:id/pdf: base64, expectedRevision
- GET /api/documentos/:id/pdf: visualização privada
- POST /api/documentos/:id/submit: expectedRevision
- POST /api/documentos/:id/decision: expectedRevision, version, approved, notes
- POST /api/documentos/:id/assignment: expectedRevision, managerIds
- POST /api/documentos/:id/share: expectedRevision

Compartilhar exige aprovação da versão exata e checksum do PDF quando APPROVALS_REQUIRED=true. O link retornado expira em cinco minutos. GET /api/documentos/shared/:ticket valida assinatura, prazo, versão, aprovação e integridade novamente; nenhuma URL bruta do GitHub ou token privado é retornada.

## Ativação posterior

1. Confirmar o repositório privado, o token Contents Read/write e o segredo já configurados.
2. Validar criação, upload, sincronização, análise por contas distintas, conflitos e recuperação de PDFs reais.
3. Concluir o coordenador de sincronização e a interface de decisões do app. Nesta entrega há módulos de serviço, metadados locais, perfis e telas de entrada; o envio automático e os botões de decisão ainda não estão ativados.
4. Habilitar DOCUMENTS_API_ENABLED=true no Netlify e EXPO_PUBLIC_DOCUMENTS_API_ENABLED=true na próxima compilação do app.
5. Só depois habilitar APPROVALS_REQUIRED=true.

Não habilite a obrigatoriedade antes dessas etapas. O campo capabilities informa enabled=false enquanto o fluxo estiver desativado. Notificações não são enviadas nesta versão; notificationEvents é a fila prevista para futura implementação.

Os testes automatizados usam armazenamento simulado; não criam laudos ou propostas reais no repositório do usuário. A interface atual não impede o proprietário de um aparelho de copiar um PDF local por ferramentas externas ao aplicativo; a autorização protege as operações da aplicação e os acessos disponibilizados pelo servidor.
