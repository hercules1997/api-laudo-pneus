export const pneus = [
  {
    "fabricante": "Continental",
    "modelo": "HSC1",
    "medida": "295/80 R22.5",
    "aro": "22.5",
    "fonte": "https://www.continental-reifen.de/products/truck/tires/hsc1/",
    "ativo": true
  },
  {
    "fabricante": "Continental",
    "modelo": "HSC1",
    "medida": "315/80 R22.5",
    "aro": "22.5",
    "fonte": "https://www.continental-reifen.de/products/truck/tires/hsc1/",
    "ativo": true
  },
  {
    "fabricante": "Royal Black",
    "modelo": "RS205",
    "medida": "295/80 R22.5",
    "indiceCarga": "152/149",
    "indiceVelocidade": "M",
    "aro": "22.5",
    "eixo": [
      "Direcional"
    ],
    "fonte": "https://www.royalblacktyre.com/product_14_RS205.html",
    "ativo": true
  },
  {
    "fabricante": "Royal Black",
    "modelo": "RS205",
    "medida": "295/75 R22.5",
    "indiceCarga": "146/143",
    "indiceVelocidade": "M",
    "aro": "22.5",
    "eixo": [
      "Direcional"
    ],
    "fonte": "https://www.royalblacktyre.com/product_14_RS205.html",
    "ativo": true
  },
  {
    "fabricante": "Royal Black",
    "modelo": "RS205",
    "medida": "315/80 R22.5",
    "indiceCarga": "156/150",
    "indiceVelocidade": "M",
    "aro": "22.5",
    "eixo": [
      "Direcional"
    ],
    "fonte": "https://www.royalblacktyre.com/product_14_RS205.html",
    "ativo": true
  },
  {
    "fabricante": "Royal Black",
    "modelo": "RS205",
    "medida": "285/75 R24.5",
    "indiceCarga": "147/144",
    "indiceVelocidade": "M",
    "aro": "24.5",
    "eixo": [
      "Direcional"
    ],
    "fonte": "https://www.royalblacktyre.com/product_14_RS205.html",
    "ativo": true
  }
];
export const pneusContinental = pneus.filter(p => p.fabricante === 'Continental');
export const pneusRoyalBlack = pneus.filter(p => p.fabricante === 'Royal Black');
