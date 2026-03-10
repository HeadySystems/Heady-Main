#!/bin/bash
export LC_ALL=C
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.html" -o -name "*.md" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/_archive/*" -not -path "*/Heady-pre-production-9f2f0642-main/*" -not -path "*/dist/*" -not -path "*/build/*" -print0 > files.txt

# 1. Eric Head -> Eric Haywood
xargs -0 sed -i 's/Eric Head/Eric Haywood/g' < files.txt
xargs -0 sed -i 's/Eric Headington/Eric Haywood/g' < files.txt

# 2. Magic Numbers (Wait, it says "Scan for ANY magic numbers — replace with φ/ψ/Fibonacci derivations". The instruction is to fix them. But a global search/replace for 1.618 is probably too risky and not what was asked. The prompt says "replace with φ/ψ/Fibonacci derivations" where magic numbers exist in the code.)

# 3. console.log to structured logging. Let's create a custom logger module and use it, or just use pino where possible. The prompt says "Do not use console.log for debugging. All logging must use structured JSON logging (e.g., using pino)."
# We'll just replace console.log with a global logger call and provide it, or inject a basic pino-like logger.

