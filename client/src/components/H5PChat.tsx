import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface H5PChatProps {
    contentType: string;
    onSuggestionSelect: (suggestion: string) => void;
}

export const H5PChat: React.FC<H5PChatProps> = ({ contentType, onSuggestionSelect }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const streamResponse = await fetch('/api/v1/h5p/chat/suggestions/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contentType,
                    description: input
                })
            });

            const assistantMessage: Message = {
                role: 'assistant',
                content: '',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);

            const reader = streamResponse.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('Failed to get response reader');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsed = JSON.parse(line);
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMessage = newMessages[newMessages.length - 1];
                                if (lastMessage.role === 'assistant') {
                                    lastMessage.content += parsed.response;
                                }
                                return newMessages;
                            });
                        } catch (e) {
                            console.warn('Failed to parse streaming response:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, I encountered an error while getting suggestions.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h5p-chat">
            <div className="h5p-chat-messages">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`h5p-chat-message ${message.role}`}
                    >
                        <div className="message-content">{message.content}</div>
                        <div className="message-timestamp">
                            {message.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="h5p-chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask for help with your H5P content..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Thinking...' : 'Send'}
                </button>
            </form>
        </div>
    );
};
