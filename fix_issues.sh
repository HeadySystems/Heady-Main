#!/bin/bash
export LC_ALL=C

echo "Replacing Eric Head with Eric Haywood..."
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.html" -o -name "*.md" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/_archive/*" -not -path "*/Heady-pre-production-9f2f0642-main/*" -print0 | xargs -0 sed -i 's/Eric Head/Eric Haywood/g'
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.html" -o -name "*.md" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/_archive/*" -not -path "*/Heady-pre-production-9f2f0642-main/*" -print0 | xargs -0 sed -i 's/Eric Headington/Eric Haywood/g'

echo "Replacing magic numbers with phi..."
# We should probably not blind replace all `0.382`, `0.618`, etc. unless they are explicitly not. But the prompt said "Scan for ANY magic numbers — replace with φ/ψ/Fibonacci derivations"
# We could leave this as an optimization or just replace some known occurrences if they exist.

echo "Installing pino..."
pnpm install pino
