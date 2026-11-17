#!/bin/bash
cd /c/Users/gyuly/Claude/Projects/ai-vj-generator/fachada-bioma
for i in 0 1 2 3 4; do AIVJ_GPU=1 node build/render_local.mjs diario.html saida $i 0 -1 high 1 2>&1 | tail -1; done
echo ALLDONE
