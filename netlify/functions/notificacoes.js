import {enviarNotificacoesPendentes} from '../../src/services/notificacoes.js';
export async function handler(){await enviarNotificacoesPendentes();return {statusCode:200,body:'Fila de notificações processada.'};}
