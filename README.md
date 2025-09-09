# LUMI Desktop Editor

## Features

### AI-Powered Content Creation Assistant

LUMI now includes an AI-powered content creation assistant that helps you create better H5P content. This feature uses Ollama to provide real-time suggestions and guidance while creating content.

#### Prerequisites

- [Ollama](https://ollama.ai/) installed and running locally
- A compatible LLM model (default: llama2) pulled and available in Ollama

#### Setup

1. Install and start Ollama:
```bash
# Pull the llama2 model
ollama pull llama2

# Start the Ollama service
ollama serve
```

2. The LUMI editor will automatically connect to Ollama running on `http://localhost:11434`

#### Using the Content Creation Assistant

1. Open the H5P editor
2. Look for the chat interface in the editor sidebar
3. Ask for suggestions about your content, for example:
   - "Help me structure an interactive video about photosynthesis"
   - "What kind of questions should I add to my course presentation?"
   - "How can I make this content more engaging?"

The assistant will provide specific suggestions based on:
- The type of H5P content you're creating
- Best practices for educational content
- Interactive elements available in H5P
- Learning objectives and assessment strategies

#### Supported H5P Content Types

The assistant provides specialized guidance for:
- H5P.InteractiveVideo
- H5P.Course
- H5P.QuestionSet
- H5P.InteractiveBook
- H5P.Timeline
- H5P.BranchingScenario
- And more...
