#!/bin/bash
# Automated paper download script

echo "📚 Downloading Heady Agent Platform research papers..."

mkdir -p papers/core papers/supplementary papers/frameworks

# Core papers
wget -q https://arxiv.org/pdf/2303.17580.pdf -O papers/core/HuggingGPT_2023.pdf &
wget -q https://aclanthology.org/2023.emnlp-demo.51.pdf -O papers/core/ModelScope_Agent_2023.pdf &
wget -q http://arxiv.org/pdf/2402.14034.pdf -O papers/core/AgentScope_2024.pdf &

# Supplementary
wget -q http://arxiv.org/pdf/2407.17789.pdf -O papers/supplementary/AgentScope_LargeScale_2024.pdf &
wget -q http://arxiv.org/pdf/2403.03031.pdf -O papers/supplementary/Cooperative_Tool_Use_2024.pdf &
wget -q http://arxiv.org/pdf/2410.10831.pdf -O papers/supplementary/Cross_Domain_Orchestration_2024.pdf &

wait
echo "✅ Download complete! Papers saved in papers/"
