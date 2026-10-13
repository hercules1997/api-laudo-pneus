import {catalogoAtual} from '../services/catalogosAdministraveis.js';
import { catalogController, queryString, bad } from './catalogController.js';
export default {
  ...catalogController(()=>catalogoAtual('medidas'), ['slug'], ['title'], ['title']),
  async list(req, res) {
    const slug = queryString(req.query.slug, 'slug');
    const busca = queryString(req.query.busca, 'busca');
    if (req.path === '/buscar' && !busca) throw bad('Informe busca.');
    const rows = (await catalogoAtual('medidas')).filter(row => row.ativo !== false && (!slug || row.slug === slug))
      .sort((a,b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.title.localeCompare(b.title,'pt-BR'));
    res.json(rows.map(row => ({
      title: row.title,
      data: row.data.filter(i => !busca || i.value.toLowerCase().includes(busca.toLowerCase()))
        .map(({ label, value }) => ({ label, value }))
    })).filter(row => row.data.length));
  }
};
