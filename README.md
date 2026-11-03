# Livro 3D

Experimento do [portfólio](https://gl-dias.pages.dev/#experimentos): os projetos do site num livro em cima da mesa, pra folhear arrastando.

**No ar:** https://gl-dias.pages.dev/livro/

## Stack

React, three.js e react-three-fiber, com Vite. As páginas são desenhadas em canvas e a folha é uma malha curvada a cada quadro. Sem WebGL, ou com o celular deitado, cai numa versão em HTML (`/livro/?plano`), sem baixar o three.js.

## Como rodar

```
npm install
npm run dev
```

Fontes, prints e posts vêm do site, então o `npm run dev` espera o repo do site servido em `http://127.0.0.1:8080`. Pra usar outro endereço, defina `LIVRO_SITE`.

## Como publicar

O Cloudflare só observa o repo do site, então são dois passos:

1. `npm run build` aqui, que escreve em `../Portif/livro`.
2. Commit e push no repo do site ([gl-dias/Portfolio](https://github.com/gl-dias/Portfolio)).

Só dar push aqui não muda o que está no ar.

Os textos dos projetos ficam em `src/` e precisam acompanhar o `index.html` do site.
