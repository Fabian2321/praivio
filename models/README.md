# AI Models

This directory contains AI models for the Praivio application.

## Required Models

The following models are required for the application to function:

1. **medgemma-27b-multimodal-IQ4_XS.gguf** (~3.7GB)
   - **Purpose**: Large multimodal model for complex tasks with image processing
   - **RAM Required**: 16GB+ recommended
   
2. **medgemma-4b-it-IQ4_XS.gguf** (~2.3GB)
   - **Purpose**: Smaller model for faster text generation
   - **RAM Required**: 8GB+ recommended

## Download Instructions

Due to their large size, these model files are not included in the git repository. You need to download them manually:

### Option 1: Using Ollama (Recommended)

```bash
# Start Ollama container
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Download models
docker exec -it ollama ollama pull medgemma:27b-multimodal
docker exec -it ollama ollama pull medgemma:4b-it

# Verify downloads
docker exec -it ollama ollama list
```

### Option 2: Direct Download from Hugging Face

Download the models directly and place them in this directory:

1. **medgemma-27b-multimodal-IQ4_XS.gguf**:
   - Source: [Hugging Face - medgemma-27b-multimodal](https://huggingface.co/google/medgemma-27b-multimodal)
   - Direct download: [IQ4_XS quantized version](https://huggingface.co/google/medgemma-27b-multimodal/resolve/main/medgemma-27b-multimodal-IQ4_XS.gguf)

2. **medgemma-4b-it-IQ4_XS.gguf**:
   - Source: [Hugging Face - medgemma-4b-it](https://huggingface.co/google/medgemma-4b-it)
   - Direct download: [IQ4_XS quantized version](https://huggingface.co/google/medgemma-4b-it/resolve/main/medgemma-4b-it-IQ4_XS.gguf)

### Option 3: Using wget/curl

```bash
# Download medgemma-27b-multimodal
wget https://huggingface.co/google/medgemma-27b-multimodal/resolve/main/medgemma-27b-multimodal-IQ4_XS.gguf

# Download medgemma-4b-it
wget https://huggingface.co/google/medgemma-4b-it/resolve/main/medgemma-4b-it-IQ4_XS.gguf
```

## Model Configuration

The `Modelfile.*` files contain the configuration for each model. These are included in the repository as they are small text files.

### Modelfile.medgemma
Configuration for the 27B multimodal model with image processing capabilities.

### Modelfile.medgemma4b
Configuration for the 4B instruction-tuned model for text generation.

## Verification

After downloading, verify the files:

```bash
# Check file sizes
ls -lh *.gguf

# Expected output:
# medgemma-27b-multimodal-IQ4_XS.gguf  ~3.7G
# medgemma-4b-it-IQ4_XS.gguf           ~2.3G
```

## Troubleshooting

### Model not found errors
- Ensure models are in the correct directory (`models/`)
- Check file permissions (should be readable)
- Verify file integrity (no corruption during download)

### Out of memory errors
- Close other applications to free RAM
- Use only the 4B model if RAM is limited
- Consider using a machine with more RAM

### Slow performance
- Ensure you have sufficient RAM (16GB+ for 27B model)
- Use SSD storage for faster model loading
- Close unnecessary background processes

## Note

The large .gguf files are excluded from git via .gitignore to prevent repository bloat. Make sure to download them before running the application.

**Important**: These models require significant computational resources. Ensure your system meets the minimum requirements before downloading. 