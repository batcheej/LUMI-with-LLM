/**
 * @fileoverview Service for interacting with Ollama LLM API to provide AI assistance
 * in H5P content creation. This service handles communication with a locally running
 * Ollama instance and provides methods for getting content suggestions and streaming
 * responses.
 */

import axios from 'axios';

/**
 * Parameters for making requests to the Ollama API
 * @interface OllamaRequestParams
 */
export interface OllamaRequestParams {
    model: string;
    prompt: string;
    stream?: boolean;
    context?: number[];
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
    };
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    context?: number[];
}

export interface StreamCallback {
    (chunk: string): void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Service class for interacting with Ollama LLM
 * @class OllamaService
 */
export class OllamaService {
    private baseUrl: string;
    private model: string;
    private abortController: AbortController | null;

    /**
     * Creates an instance of OllamaService
     * @param {string} baseUrl - Base URL of the Ollama API server
     * @param {string} model - Name of the model to use (e.g., 'llama2')
     */
    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
        this.baseUrl = baseUrl;
        this.model = model;
        this.abortController = null;
    }

    stopStream() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    async chat(prompt: string, context?: number[]): Promise<OllamaResponse> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt,
                context,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error calling Ollama:', error);
            throw new Error('Failed to get response from Ollama');
        }
    }

    async chatStream(prompt: string, callback: StreamCallback, context?: number[]): Promise<void> {
        this.abortController = new AbortController();

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt,
                    context,
                    stream: true,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                    }
                }),
                signal: this.abortController.signal
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Failed to get response reader');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    callback.onComplete?.();
                    break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsed = JSON.parse(line);
                            callback(parsed.response);
                        } catch (e) {
                            console.warn('Failed to parse streaming response:', e);
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
                return;
            }
            console.error('Error in chat stream:', error);
            callback.onError?.(error);
            throw error;
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Gets specific prompt guidance based on H5P content type
     * @private
     * @param {string} contentType - The H5P content type (e.g., 'H5P.InteractiveVideo')
     * @returns {string} Specific guidance for the content type
     */
    private getContentTypePrompt(contentType: string): string {
        const contentTypePrompts: Record<string, string> = {
            'H5P.InteractiveVideo': 'Consider: timestamps for interactions, types of questions to ask at each point, visual cues, and branching scenarios.',
            'H5P.Course': 'Structure your course with: main topics, subtopics, learning objectives, assessment criteria, and progression rules.',
            'H5P.QuestionSet': 'Include variety in question types: multiple choice, true/false, fill in the blanks, matching, and drag-and-drop.',
            'H5P.InteractiveBook': 'Plan chapters with: multimedia content, interactive elements, self-assessment, and navigation structure.',
            'H5P.Timeline': 'Organize events with: dates, descriptions, media elements, and connections between events.',
            'H5P.BranchingScenario': 'Design decision trees with: multiple paths, consequences, feedback, and learning outcomes.',
        };

        return contentTypePrompts[contentType] || 'Consider the best way to present this content interactively.';
    }

    async getH5PContentSuggestions(contentType: string, description: string): Promise<string> {
        const typeSpecificPrompt = this.getContentTypePrompt(contentType);
        const prompt = `As an H5P content creation assistant, help me create ${contentType} content with the following description: ${description}.
        
        ${typeSpecificPrompt}
        
        Please provide specific suggestions including:
        1. Content Structure
        2. Interactive Elements
        3. Learning Objectives
        4. Assessment Strategies
        5. Technical Implementation Tips
        
        Format your response in clear sections with bullet points for easy implementation.`;
        
        const response = await this.chat(prompt);
        return response.response;
    }
}
