import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const [file, output] = process.argv.slice(2);
try {
  if (!file || !output) throw new Error('Uso: npm run extract:vipal -- guia.pdf texto.txt');
  const pdf = await getDocument({ data: new Uint8Array(await fs.readFile(file)), useSystemFonts: true }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    pages.push('PÁGINA ' + n + '\n' + content.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join(''));
  }
  await fs.writeFile(output, pages.join('\n\n'), { encoding: 'utf8', flag: 'wx' });
  await pdf.destroy();
  console.log('Texto extraído para revisão. Não foi importado automaticamente.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
