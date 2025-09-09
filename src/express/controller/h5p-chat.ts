import * as Express from 'express';
import { OllamaService } from '../../implementations/OllamaService';
import { Readable } from 'stream';

const router = Express.Router();
const ollamaService = new OllamaService();

router.post(
    '/api/v1/h5p/chat/suggestions',
    async (req: Express.Request, res: Express.Response) => {
        try {
            const { contentType, description } = req.body;

            if (!contentType || !description) {
                return res.status(400).json({
                    error: 'Content type and description are required'
                });
            }

            const suggestions = await ollamaService.getH5PContentSuggestions(
                contentType,
                description
            );

            res.json({ suggestions });
        } catch (error) {
            console.error('Error getting H5P content suggestions:', error);
            res.status(500).json({
                error: 'Failed to get content suggestions'
            });
        }
    }
);

// Streaming endpoint
router.post(
    '/api/v1/h5p/chat/suggestions/stream',
    async (req: Express.Request, res: Express.Response) => {
        try {
            const { contentType, description } = req.body;

            if (!contentType || !description) {
                return res.status(400).json({
                    error: 'Content type and description are required'
                });
            }

            // Set headers for streaming
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Create a transform stream to handle the response
            const stream = new Readable({
                read() {} // Implementation required but not used
            });

            // Pipe the stream to the response
            stream.pipe(res);

            // Handle streaming response from Ollama
            await ollamaService.chatStream(
                await ollamaService.getH5PContentSuggestions(contentType, description),
                (chunk: string) => {
                    stream.push(JSON.stringify({ response: chunk }) + '\n');
                }
            );

            // End the stream
            stream.push(null);
        } catch (error) {
            console.error('Error in streaming suggestions:', error);
            res.status(500).json({
                error: 'Failed to stream content suggestions'
            });
        }
    }
);

export default router;
