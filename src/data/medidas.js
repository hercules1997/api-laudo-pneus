import { catalogs } from './catalogos.js';
export const medidas = catalogs.medidas;
export const tireSections = medidas.map(({title,data})=>({title,data}));
