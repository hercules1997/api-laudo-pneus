// Catálogo inicial: nomes confirmados, sem inferir especificações.
export const bandas = ['VT110', 'VRT3'].map(codigo => ({
  codigo, nome: codigo, fabricante: 'Vipal', ativo: true,
  fonte: 'https://vipal.com/pt/catalogo/renovado-de-pneus'
}));
