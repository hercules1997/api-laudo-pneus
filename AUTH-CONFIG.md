# Login e administração sem banco de dados

A API usa o repositório privado hercules1997/laudo-mobile-acessos como cadastro de contas.
Não há MongoDB/Supabase. Catálogos continuam nos JSONs públicos do projeto; contas e hashes ficam no repositório privado.

## Ativar no Netlify

Cadastre estas variáveis no projeto da API (Environment variables, All scopes, todos os contextos):

- AUTH_GITHUB_REPO = hercules1997/laudo-mobile-acessos
- AUTH_GITHUB_BRANCH = main
- AUTH_GITHUB_PATH = users.json
- AUTH_GITHUB_TOKEN = um token fine-grained restrito a esse repositório, Contents: Read and write.
- AUTH_JWT_SECRET = a chave aleatória presente no arquivo local .setup/netlify.env do aplicativo integrado.
- AUTH_REQUIRE_LOGIN = false para manter catálogos públicos compatíveis; true para exigir sessão também em /api/... (veja ressalva abaixo).

Marque o token e a chave JWT como secrets e faça novo deploy.
Nunca coloque essas duas chaves no app, EXPO_PUBLIC_*, GitHub público, screenshots ou mensagens.
O arquivo .setup/netlify.env é local/privado; não deve ser enviado ao GitHub.

Para criar o token: GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.
Resource owner: hercules1997. Repository access: Only select repositories > laudo-mobile-acessos.
Repository permissions: Contents > Read and write. Escolha prazo de validade e renove antes de vencer.

AUTH_REQUIRE_LOGIN não torna /catalogos/*.json privado: esses arquivos são cópias estáticas públicas.
Para tornar os próprios catálogos confidenciais, remova essas cópias estáticas do build; usuários e senhas nunca são publicados nelas.

## Primeiro administrador

Foi preparado o usuário admin no repositório privado com hash scrypt.
A senha temporária está somente em Downloads/laudo-mobile-integrado/.setup/primeiro-acesso.txt.
Após configurar as variáveis e entrar, troque a senha temporária em Minha conta para liberar as telas.
O painel Administração permite criar usuários, definir senhas temporárias, alterar perfis e suspender/reativar acesso.
Não há auto-cadastro público. Recuperação de senha é feita pelo administrador; não há envio automático de emails.

## API

POST /api/auth/login {username,password}
GET /api/auth/me
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/password {currentPassword,newPassword}
GET /api/auth/users (admin)
POST /api/auth/users {username,name,password,role} (admin)
PATCH /api/auth/users/:id {name,role,active,password} (admin)
GET /api/auth/status (configuração disponível, sem segredos)

Endpoints protegidos usam Authorization: Bearer <token>.
Perfis: admin, consultor, leitor. Usuários ativos e versão de sessão são conferidos no arquivo privado a cada ação autenticada.
Senhas têm salt aleatório+scrypt; JWT dura 1 hora; alteração de senha/suspensão/logout invalida tokens anteriores.
Cinco senhas incorretas bloqueiam a conta por 15 minutos. Há limitação adicional de tentativas por instância, que não substitui proteção de tráfego na borda.
Conflito de edição no GitHub retorna 409; dados não são sobrescritos silenciosamente.

## Limites operacionais

O GitHub é adequado aqui para uma equipe pequena e poucas alterações de cadastro; cada validação de sessão consulta sua API.
Operações dependem da disponibilidade, permissões, expiração do token e cota da API GitHub.
Nenhum hash é entregue às telas. Não use um repositório público para contas.
Antes de ampliar para muitos usuários, migre a autenticação para um serviço dedicado.
Os testes usam uma store simulada e não fazem alterações nos usuários reais.
