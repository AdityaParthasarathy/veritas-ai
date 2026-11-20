<#
.SYNOPSIS
  Creates the large, git-ignored ML files needed for analysis: the MiniLM embedding model, the spaCy model,
  the WELFake dataset (checksum verified), the trained classifier and the out-of-domain profile.

.DESCRIPTION
  Run from the repository root after creating the virtual environment and installing the ML requirements:

    py -3 -m venv .venv
    .venv\Scripts\python.exe -m pip install -r backend\requirements-ml.txt
    powershell -ExecutionPolicy Bypass -File scripts\setup-ml.ps1

  Downloads: about 90 MB (embedding model), about 12 MB (spaCy model) and 245 MB (WELFake, from the official
  Zenodo record 4561253). Training takes about 5 minutes. Safe to re-run: existing files are reused.
#>
param(
    [switch]$SkipTrain
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    throw "Virtual environment not found at $python. Create it first (see the header of this script)."
}

$datasetUrl = "https://zenodo.org/api/records/4561253/files/WELFake_Dataset.csv/content"
$datasetMd5 = "73c9675a4b3d09f86a6933d0b8d7d908"
$spacyWheel = "https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
$csvPath = Join-Path $root "data\raw\WELFake_Dataset.csv"
$modelDir = Join-Path $root "models\all-MiniLM-L6-v2"

function Invoke-Step($label, [scriptblock]$action) {
    Write-Host "==> $label" -ForegroundColor Cyan
    & $action
    if ($LASTEXITCODE -ne 0) { throw "Step failed: $label" }
}

# 1. spaCy model
& $python -c "import spacy; spacy.load('en_core_web_sm')" 2>$null
if ($LASTEXITCODE -ne 0) {
    Invoke-Step "Installing the spaCy model en_core_web_sm" { & $python -m pip install $spacyWheel }
} else { Write-Host "==> spaCy model already installed" }

# 2. Embedding model
if (-not (Test-Path $modelDir)) {
    Invoke-Step "Downloading sentence-transformers/all-MiniLM-L6-v2 to models\" {
        & $python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu').save(r'$modelDir')"
    }
} else { Write-Host "==> Embedding model already present" }

# 3. Dataset with checksum verification
New-Item -ItemType Directory -Force (Split-Path $csvPath) | Out-Null
if (-not (Test-Path $csvPath)) {
    Write-Host "==> Downloading WELFake (245 MB) from Zenodo" -ForegroundColor Cyan
    Invoke-WebRequest $datasetUrl -OutFile $csvPath
}
$actual = (Get-FileHash $csvPath -Algorithm MD5).Hash.ToLower()
if ($actual -ne $datasetMd5) {
    throw "WELFake checksum mismatch (expected $datasetMd5, got $actual). Delete $csvPath and re-run."
}
Write-Host "==> WELFake checksum verified ($actual)"

# 4. Train and profile
if (-not $SkipTrain) {
    Push-Location (Join-Path $root "backend")
    try {
        $env:PYTHONIOENCODING = "utf-8"
        Invoke-Step "Training the classifier (about 5 minutes)" { & $python -m app.ml.train }
        Invoke-Step "Fitting the out-of-domain profile" { & $python -m app.ml.domain_profile }
    } finally { Pop-Location }
}
Write-Host "Done. ML files are ready; start the app with: docker compose up -d --build" -ForegroundColor Green
