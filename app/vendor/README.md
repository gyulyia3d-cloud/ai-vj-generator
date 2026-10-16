# Terceiros embutidos

- `jszip.min.js`: JSZip v3.10.1, Stuart Knightley e colaboradores, licença dupla MIT ou GPLv3 (cabeçalho preservado no arquivo; usa pako, MIT/zlib). Fonte: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js, sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==. Embutido em `app/index.html` por `node scripts/embed-modules.mjs` (marcador `JSZIP`). Para atualizar: baixe a nova versão, confira o hash publicado, troque o arquivo e rode o embed.
