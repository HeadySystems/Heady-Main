#!/bin/bash
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.html" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/_archive/*" -not -path "*/Heady-pre-production-9f2f0642-main/*" -print0 | xargs -0 grep -l "localStorage" > files_with_localstorage.txt
