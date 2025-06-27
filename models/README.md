# AI Models

This directory contains AI models for the Praivio application.

## Required Models

The following models are required for the application to function:

1. **medgemma-27b-multimodal-IQ4_XS.gguf** (~3.7GB)
2. **medgemma-4b-it-IQ4_XS.gguf** (~2.3GB)

## Download Instructions

Due to their large size, these model files are not included in the git repository. You need to download them manually:

### Option 1: Direct Download
Download the models from Hugging Face or other sources and place them in this directory.

### Option 2: Using Ollama
If you have Ollama installed, you can pull the models using:

```bash
ollama pull medgemma:27b-multimodal
ollama pull medgemma:4b-it
```

### Option 3: Using Git LFS (Future)
For future versions, we may implement Git LFS to handle large files properly.

## Model Configuration

The Modelfile.* files contain the configuration for each model. These are included in the repository as they are small text files.

## Note

The large .gguf files are excluded from git via .gitignore to prevent repository bloat. Make sure to download them before running the application. 