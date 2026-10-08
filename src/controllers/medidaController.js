import Medida from '../models/Medida.js';
import { catalogController, queryString, bad } from './catalogController.js';
const crud = catalogController(Medida, ['slug'], ['title']);
export default {
  ...crud,
  async list(req, res) {
    const slug = queryString(req.query.slug, 'slug');
    const busca = queryString(req.query.busca, 'busca');
    if (req.path === '/buscar' && !busca) throw bad('Informe busca.');
    const rows = await Medida.find({ ativo: true, ...(slug ? { slug } : {}) }).sort({ ordem: 1, title: 1 }).lean();
    res.json(rows.map(row => ({
      title: row.title,
      data: row.data.filter(i => !busca || i.value.toLowerCase().includes(busca.toLowerCase())).map(({ label, value }) => ({ label, value }))
    })).filter(row => row.data.length));
  }
};
