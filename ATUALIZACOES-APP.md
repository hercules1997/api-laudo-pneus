# Publicação das atualizações Android

O aplicativo consulta `GET /api/app/version` ao abrir, ao voltar ao primeiro plano e a cada 15 minutos enquanto a tela inicial estiver montada. A aba Atualizações oferece o APK apenas quando o código Android publicado é maior que o instalado e o link é HTTPS de distribuição oficial do Expo. A instalação sempre depende da confirmação do Android.

O manifesto só deve ser publicado depois de o Expo concluir o APK. Nunca divulgue um arquivo em processamento. O script valida status, plataforma, versão e link antes de escrever o manifesto:

```powershell
eas build:view ID_DA_COMPILACAO --json > compilacao.json
node scripts/publishAndroidRelease.js compilacao.json "Descrição das melhorias"
git add src/data/app-release.json
git commit -m "Publish Android app release"
git push origin master
```

Após o deploy, o publicador operacional envia a notificação de atualização aos dispositivos ativos cadastrados no Neon. O envio usa o Expo Push Service e mantém controle local para não repetir avisos da mesma versão. Esse publicador e suas credenciais ficam fora do ZIP e do repositório do aplicativo. Celulares sem permissão de notificação continuam recebendo o aviso visual ao abrir o app.

Ao tocar em uma notificação de atualização, a nova versão do aplicativo abre a aba Atualizações. Dispositivos com versões anteriores à introdução dessa aba precisam instalar primeiro o APK 1.4.14 pelo Expo. Os próximos avisos já passam a usar a aba.

As compilações não viram atualizações públicas automaticamente: a etapa de publicação acima deve integrar cada entrega aprovada. Isso evita anunciar builds de teste, incompletos ou recusados.
