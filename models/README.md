# AI Models

This directory contains AI models for the Praivio application.

## Current Setup

Praivio now uses **Ollama** for model management, which provides a more flexible and user-friendly approach to running AI models locally.

### Available Models

The following models are currently loaded in Ollama and available for use:

1. **tinyllama:latest** (637 MB)
   - **Purpose**: Fast, lightweight model for simple tasks
   - **RAM Required**: 2GB+ recommended
   
2. **phi:2.7b** (1.6 GB)
   - **Purpose**: Microsoft's Phi model for general text generation
   - **RAM Required**: 4GB+ recommended

3. **qwen2.5:3b** (1.9 GB)
   - **Purpose**: Alibaba's Qwen model for text generation
   - **RAM Required**: 4GB+ recommended

4. **llama2:7b** (3.8 GB)
   - **Purpose**: Meta's Llama 2 model for general tasks
   - **RAM Required**: 8GB+ recommended

## Model Management

### View Available Models
```bash
docker exec praivio-ollama ollama list
```

### Add New Models
```bash
# Example: Add a new model
docker exec praivio-ollama ollama pull modelname:version
```

### Remove Models
```bash
# Example: Remove a model
docker exec praivio-ollama ollama rm modelname:version
```

## Legacy Files

The following files are kept for reference but are no longer actively used:

- **medgemma-27b-multimodal-IQ4_XS.gguf**: Large multimodal model (kept for future use)
- **medgemma-4b-it-IQ4_XS.gguf**: Smaller instruction-tuned model (kept for future use)
- **Modelfile.medgemma**: Configuration for 27B model
- **Modelfile.medgemma4b**: Configuration for 4B model

## Troubleshooting

### Model not found errors
- Ensure the model is loaded in Ollama: `docker exec praivio-ollama ollama list`
- Check if the model name is correct in the frontend
- Verify Ollama service is running: `docker ps | grep ollama`

### Out of memory errors
- Use smaller models (tinyllama, phi:2.7b) if RAM is limited
- Close other applications to free RAM
- Consider using a machine with more RAM for larger models

### Slow performance
- Use smaller models for faster responses
- Ensure you have sufficient RAM
- Use SSD storage for faster model loading

## Note

The large .gguf files are excluded from git via .gitignore to prevent repository bloat. The application now primarily uses Ollama for model management, which handles downloads automatically. 