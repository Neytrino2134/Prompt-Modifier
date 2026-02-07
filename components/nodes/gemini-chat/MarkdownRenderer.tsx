
import React, { useState } from 'react';
import { CopyIcon } from '../../../components/icons/AppIcons';
import { formatText } from './utils';

// Component for Code Block with Copy Button
const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group/code my-2">
            <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                <button 
                    onClick={handleCopy}
                    className="p-1.5 bg-gray-700 hover:bg-accent text-gray-300 hover:text-white rounded text-xs flex items-center gap-1 shadow-sm transition-colors"
                    title={copied ? "Copied!" : "Copy Code"}
                >
                    {copied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <CopyIcon className="h-4 w-4" />
                    )}
                </button>
            </div>
            <pre className="bg-gray-900/80 p-3 rounded-md border border-gray-600 text-accent-text overflow-x-auto font-mono text-xs shadow-inner [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500 select-text">
                <code>{code}</code>
            </pre>
        </div>
    );
};

// A component to render markdown-like content from the AI
export const MarkdownContent: React.FC<{ content: string }> = React.memo(({ content }) => {
    // Split by code blocks first to avoid formatting inside code
    // Matches ```prompt ... ``` OR generic ``` ... ```
    const parts = content.split(/(```prompt\n[\s\S]*?\n```|```[\s\S]*?```)/g);

    return (
        <div className="text-sm leading-relaxed space-y-2 text-gray-200 break-words cursor-text">
            {parts.map((part, index) => {
                // 1. Special Prompt Code Block
                const promptMatch = part.match(/```prompt\n([\s\S]*?)\n```/);
                if (promptMatch) {
                    return <CodeBlock key={index} code={promptMatch[1].trim()} />;
                }

                // 2. Generic Code Block
                const codeMatch = part.match(/```([\s\S]*?)```/);
                if (codeMatch) {
                    let rawCode = codeMatch[1];
                    // Clean up language identifier (e.g., "bash", "python") from the first line
                    const firstNewLine = rawCode.indexOf('\n');
                    if (firstNewLine !== -1) {
                        const potentialLang = rawCode.substring(0, firstNewLine).trim();
                        // If the first line is a single word (no spaces), treat it as a language tag and remove it
                        if (potentialLang && !potentialLang.includes(' ')) {
                             rawCode = rawCode.substring(firstNewLine + 1);
                        }
                    }
                    return <CodeBlock key={index} code={rawCode.trim()} />;
                }

                // 3. Standard Text Content
                if (!part.trim()) return null;

                const lines = part.split('\n');
                const elements: React.ReactNode[] = [];
                let listBuffer: React.ReactNode[] = [];
                let isOrderedList = false;

                const flushList = () => {
                    if (listBuffer.length > 0) {
                        if (isOrderedList) {
                            elements.push(
                                <ol key={`list-${index}-${elements.length}`} className="list-decimal list-outside ml-4 space-y-1 mb-2 marker:text-gray-500 select-text">
                                    {[...listBuffer]}
                                </ol>
                            );
                        } else {
                            elements.push(
                                <ul key={`list-${index}-${elements.length}`} className="list-disc list-outside ml-4 space-y-1 mb-2 marker:text-gray-500 select-text">
                                    {[...listBuffer]}
                                </ul>
                            );
                        }
                        listBuffer = [];
                    }
                };

                lines.forEach((line, lineIdx) => {
                    // Regex for list items and headers
                    const orderedMatch = line.match(/^(\d+)\.\s+(.*)/);
                    const unorderedMatch = line.match(/^[\*\-]\s+(.*)/);
                    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);

                    if (orderedMatch) {
                        // Ordered List Item
                        if (listBuffer.length > 0 && !isOrderedList) flushList(); // Switch list type if needed
                        isOrderedList = true;
                        
                        // Extract the number from string to maintain continuity across code blocks
                        const itemNumber = parseInt(orderedMatch[1], 10);
                        
                        listBuffer.push(
                            <li 
                                key={lineIdx} 
                                value={itemNumber} // Explicitly set value to fix numbering resets
                                dangerouslySetInnerHTML={{ __html: formatText(orderedMatch[2]) }} 
                            />
                        );
                    } else if (unorderedMatch) {
                        // Unordered List Item
                        if (listBuffer.length > 0 && isOrderedList) flushList(); // Switch list type if needed
                        isOrderedList = false;
                        listBuffer.push(<li key={lineIdx} dangerouslySetInnerHTML={{ __html: formatText(unorderedMatch[1]) }} />);
                    } else {
                        flushList(); // End any active list

                        if (headerMatch) {
                            // Headers
                            const level = headerMatch[1].length;
                            const fontSize = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
                            // Themed header color
                            elements.push(
                                <div key={lineIdx} className={`${fontSize} font-bold text-accent-text mt-3 mb-1 border-b border-gray-700/50 pb-1 select-text`} dangerouslySetInnerHTML={{ __html: formatText(headerMatch[2]) }} />
                            );
                        } else {
                            // Paragraphs
                            if (line.trim() === '') {
                                elements.push(<div key={lineIdx} className="h-2" />); // Spacer for empty lines
                            } else {
                                elements.push(<div key={lineIdx} className="min-h-[1.2em] select-text" dangerouslySetInnerHTML={{ __html: formatText(line) }} />);
                            }
                        }
                    }
                });
                flushList(); // Flush any remaining list items

                return <div key={index} className="select-text">{elements}</div>;
            })}
        </div>
    );
});
