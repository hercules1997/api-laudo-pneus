export default function notFound(req, res) { res.status(404).json({ message: 'Rota não encontrada.' }); }
