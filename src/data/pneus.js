import { catalogs } from './catalogos.js';
export const pneus = catalogs.pneus;
export const pneusContinental = pneus.filter(p=>p.fabricante==='Continental');
export const pneusRoyalBlack = pneus.filter(p=>p.fabricante==='Royal Black');
