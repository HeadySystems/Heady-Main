#!/usr/bin/env python3
"""
Heady Deterministic Execution Build Script

Extracts all source files from 03-deterministic-execution-error-prediction.md
and packages them with project documentation into a complete deliverable zip.

© 2026 HeadySystems Inc.
"""
import re
import shutil
import zipfile
from pathlib import Path

# Configuration
SPEC_FILE = "03-deterministic-execution-error-prediction.md"
ZIP_NAME = "heady-deterministic-execution-complete.zip"
BUILD_DIR = Path("heady_build")

# Documentation files to include
DOCS = [
    "03-deterministic-execution-error-prediction.md",
    "Heady_Service_Reference.docx",
    "Heady_System_Architecture_Overview.docx",
    "Heady_Development_Deployment_Guide.docx"
]

# Regex to extract embedded source files
# Matches: ### `path/to/file.js` followed by ```javascript or ```js code block
PATTERN = re.compile(
    r'###\s+`([^`]+\.(?:js|mjs|ts))`\s*\n+```(?:javascript|js|typescript)?\n(.*?)```',
    re.DOTALL
)

def main():
    print("[*] Starting Heady Deterministic Execution build...")
    
    # Clean and create build directory
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    
    (BUILD_DIR / "docs").mkdir(parents=True)
    (BUILD_DIR / "src").mkdir(parents=True)
    
    # Step 1: Copy documentation files
    print("[*] Copying project documentation...")
    doc_count = 0
    for doc_name in DOCS:
        doc_path = Path(doc_name)
        if doc_path.exists():
            dest = BUILD_DIR / "docs" / doc_path.name
            shutil.copy2(doc_path, dest)
            doc_count += 1
            print(f"    ✓ {doc_name}")
        else:
            print(f"    ✗ {doc_name} (not found)")
    
    print(f"[*] Copied {doc_count}/{len(DOCS)} documentation files")
    
    # Step 2: Extract source files from spec
    print(f"[*] Extracting source files from {SPEC_FILE}...")
    
    if not Path(SPEC_FILE).exists():
        print(f"[!] ERROR: {SPEC_FILE} not found")
        return 1
    
    spec_content = Path(SPEC_FILE).read_text(encoding="utf-8", errors="replace")
    
    # Find all embedded source files
    matches = PATTERN.findall(spec_content)
    
    if not matches:
        print("[!] WARNING: No source files found in spec")
    
    extracted_files = set()
    for file_path, code_content in matches:
        file_path = file_path.strip()
        
        # Skip duplicates (spec may have multiple versions)
        if file_path in extracted_files:
            continue
        
        extracted_files.add(file_path)
        
        # Create output path
        output_path = BUILD_DIR / "src" / file_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write extracted code
        output_path.write_text(code_content.rstrip() + "\n", encoding="utf-8")
        print(f"    ✓ {file_path}")
    
    print(f"[*] Extracted {len(extracted_files)} source files")
    
    # Step 3: Create README
    print("[*] Generating README...")
    readme_content = f"""# Heady Deterministic Prompt Execution System

© 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.

## Package Contents

This package contains the complete implementation of the Heady Deterministic Prompt 
Execution system with CSL-gated error prediction.

### Documentation (`docs/`)
- `03-deterministic-execution-error-prediction.md` - Master specification
- `Heady_Service_Reference.docx` - Service reference guide
- `Heady_System_Architecture_Overview.docx` - Architecture overview
- `Heady_Development_Deployment_Guide.docx` - Deployment guide

### Source Code (`src/`)
- `src/prompts/` - Deterministic prompt execution engine
  - `deterministic-prompt-executor.js` - Main executor with caching
  - `csl-confidence-gate.js` - Error prediction gate
- `src/analytics/` - Continuous action analysis
  - `continuous-action-analyzer.js` - Pattern learning and drift detection
- `src/core/csl-engine/` - Continuous Semantic Logic engine
  - `csl-engine.js` - Core CSL geometric operations
- `src/core/` - CSL gates implementation
  - `csl-gates-enhanced.js` - Universal vector gates (Patent HS-058)
- `src/shared/` - Shared utilities
  - `sacred-geometry.js` - Phi-based resource allocation
  - `phi-math.js` - Golden ratio mathematical primitives

## Implementation

All source files are production-ready Node.js modules. Key features:

1. **Deterministic Execution**: Same input → same output (SHA-256 hash match)
2. **CSL Confidence Gate**: Pre-flight error prediction (φ-scaled thresholds)
3. **Self-Healing**: Auto-reconfigure when confidence < φ⁻² ≈ 0.382
4. **Continuous Learning**: Pattern detection from execution history
5. **Drift Detection**: Rolling window variance monitoring

## Golden Ratio (φ) Foundation

All thresholds derived from φ = 1.6180339887:
- φ⁻¹ ≈ 0.618 (EXECUTE threshold)
- φ⁻² ≈ 0.382 (CAUTIOUS/HALT boundary)
- φ⁻³ ≈ 0.236 (Temperature for soft gates)

## Installation

```bash
cd src
npm install  # Install dependencies (crypto, events)
```

## Testing

Complete Jest test suite included in spec (Section: TEST SUITE).

## Contact

HeadySystems Inc.
https://HeadySystems.com
https://HeadyConnection.org

Generated: {Path.cwd().name}
Files: {len(extracted_files)} source + {doc_count} docs
"""
    
    (BUILD_DIR / "README.md").write_text(readme_content, encoding="utf-8")
    print("    ✓ README.md")
    
    # Step 4: Create manifest
    print("[*] Creating manifest...")
    all_files = sorted(BUILD_DIR.rglob("*"))
    file_list = [str(f.relative_to(BUILD_DIR)) for f in all_files if f.is_file()]
    
    manifest_path = BUILD_DIR / "MANIFEST.txt"
    manifest_path.write_text("\n".join(file_list) + "\n", encoding="utf-8")
    print(f"    ✓ MANIFEST.txt ({len(file_list)} files)")
    
    # Step 5: Create zip archive
    print(f"[*] Creating {ZIP_NAME}...")
    with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in BUILD_DIR.rglob("*"):
            if file_path.is_file():
                arcname = str(file_path.relative_to(BUILD_DIR))
                zf.write(file_path, arcname)
    
    zip_size = Path(ZIP_NAME).stat().st_size
    print(f"[✓] Package created: {ZIP_NAME} ({zip_size:,} bytes)")
    
    # Step 6: Summary
    print("\n" + "="*60)
    print("BUILD COMPLETE")
    print("="*60)
    print(f"Package: {ZIP_NAME}")
    print(f"Documentation: {doc_count} files")
    print(f"Source files: {len(extracted_files)} files")
    print(f"Total size: {zip_size:,} bytes")
    print("\nContents:")
    print("  docs/        Project documentation")
    print("  src/         Complete source code")
    print("  README.md    Package overview")
    print("  MANIFEST.txt Complete file listing")
    print("\nExtract and deploy to HeadyMe repos.")
    print("="*60)
    
    return 0

if __name__ == "__main__":
    exit(main())
