import pneus from '../../data/pneus.json' with {type:'json'};
import {validateProposalItems, catalogProposalItems} from './proposalPolicy.mjs';

/** Validate the catalog snapshot against the server, not a caller-controlled axle description. */
export function validateProposalBusiness(payload) {
  try {
    validateProposalItems(payload);
    const canonical = catalogProposalItems(payload.itens, pneus);
    canonical.forEach((item,index) => {
      if (item.tipo === 'novo' && (item.aplicacao !== payload.itens[index].aplicacao || item.descricao !== payload.itens[index].descricao)) {
        throw Object.assign(new Error('A aplicação ou o modelo mudou no catálogo. Atualize os catálogos e gere o PDF novamente.'), {status:409});
      }
    });
  } catch (error) {
    error.status ||= 400;
    throw error;
  }
}
