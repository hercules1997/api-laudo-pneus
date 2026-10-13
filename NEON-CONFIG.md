# Contas, documentos e arquivos privados

A API continua no Netlify. Os catálogos permanecem JSON. Configure DATABASE_URL e AUTH_STORAGE=neon para contas no PostgreSQL. A migração inicial importa users.json preservando hashes e primeiro acesso. Nunca publicar conexões, tokens ou .setup.

PDFs e fotos usam o bucket privado laudos-documentos. Configure STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_REGION e STORAGE_BUCKET como segredos no Netlify. Os nomes AWS_* não são usados porque alguns são reservados no Netlify.

DOCUMENTS_API_ENABLED=true libera a sincronização. APPROVALS_REQUIRED=true exige aprovação para compartilhar pelo servidor. O aplicativo consulta essas opções. Sem conexão, geração e armazenamento locais continuam; a sincronização pode ser retomada em Meus documentos.

Cada autor acessa seus documentos; gestores acessam documentos das unidades vinculadas; administradores acessam todos. Distribuir uma solicitação restringe quem pode decidir, mantendo a consulta dos gestores da unidade. A revisão invalida a aprovação e preserva o PDF anterior. Conflitos retornam 409, sem sobrescrever decisões.

Arquivos ficam no armazenamento privado; o banco guarda apenas referências e histórico. O adaptador PostgreSQL para arquivos é legado/testes e não é usado pela aplicação em produção. Limite por PDF/foto: 4 MB; imagens JPEG/PNG. Ajustes de limite exigem avaliar limites do Netlify.

Troca obrigatória de senha somente no primeiro acesso da conta criada. Alteração posterior é opcional, sem reativar essa exigência. Sessão de acesso de 1 hora e renovação de até 30 dias, revogadas por suspensão, troca de senha ou mudança de permissões.

Execute `npm run setup:neon` para aplicar as migrações idempotentes, incluindo 003-notificacoes.sql. Eventos de status são registrados na mesma transação do documento e disponibilizados em GET /api/notificacoes. POST /api/notificacoes/:id/lida marca leitura; POST /api/notificacoes/dispositivo/registrar recebe um ExpoPushToken autenticado. A função agendada notificacoes processa a fila a cada cinco minutos, conferindo as permissões atuais. Remoção de acesso impede novos avisos sobre documentos restritos.

Notificações externas dependem do Firebase Android e das credenciais FCM v1 no Expo EAS. A chave privada Firebase não pertence a este repositório. Opcionalmente configure EXPO_PUSH_ACCESS_TOKEN no Netlify se a proteção do serviço Expo Push estiver habilitada. O aceite de um ticket pelo Expo não garante entrega ao aparelho.

Contatos das propostas são verificados contra o cadastro do autor e do gestor ativo da unidade selecionada. Alterações no formulário são recusadas. Para documentos locais antigos com contatos desatualizados, confira os cadastros e gere novamente a proposta antes de sincronizar.
