
import { addMetadataToPNG } from '../../../utils/pngMetadata';

// Helper function to format inline text (bold, code, links)
export const formatText = (text: string) => {
    // Basic sanitization
    let safeText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // Markdown Links [text](url) - Themed
    safeText = safeText.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g, 
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/50 hover:decoration-cyan-300 transition-colors break-words">$1</a>'
    );

    // Bold **text** - Themed
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-text font-bold">$1</strong>');
    
    // Bold __text__ - Themed
    safeText = safeText.replace(/__(.*?)__/g, '<strong class="text-accent-text font-bold">$1</strong>');

    // Inline code `text` - Themed
    safeText = safeText.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded text-accent-text font-mono text-xs">$1</code>');

    return safeText;
};

export const handleDownloadTxt = (content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `Gemini_Chat_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const handleDownloadDoc = (content: string) => {
    // 1. Basic sanitization
    let htmlBody = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. Headers
    htmlBody = htmlBody.replace(/^### (.*$)/gim, '<h3 style="color: #0891b2; font-size: 14pt; margin-top: 12pt; margin-bottom: 3pt; font-family: \'Calibri Light\', sans-serif;">$1</h3>');
    htmlBody = htmlBody.replace(/^## (.*$)/gim, '<h2 style="color: #0891b2; font-size: 16pt; margin-top: 14pt; margin-bottom: 6pt; font-family: \'Calibri Light\', sans-serif;">$1</h2>');
    htmlBody = htmlBody.replace(/^# (.*$)/gim, '<h1 style="color: #0891b2; font-size: 18pt; margin-top: 16pt; margin-bottom: 6pt; font-family: \'Calibri Light\', sans-serif;">$1</h1>');

    // 3. Bold / Italic
    htmlBody = htmlBody.replace(/\*\*(.*?)\*\*/g, '<b style="color: #0891b2;">$1</b>');
    htmlBody = htmlBody.replace(/__(.*?)__/g, '<b style="color: #0891b2;">$1</b>');
    htmlBody = htmlBody.replace(/\*(.*?)\*/g, '<i>$1</i>');
    htmlBody = htmlBody.replace(/_(.*?)_/g, '<i>$1</i>');

    // 4. Code Blocks
    htmlBody = htmlBody.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
         const formattedCode = codeContent.replace(/\n/g, '<br>');
         return `<div style="background-color: #f5f5f5; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 10pt; margin: 10px 0;">${formattedCode}</div>`;
    });

    // 5. Inline Code
    htmlBody = htmlBody.replace(/`([^`]+)`/g, '<span style="background-color: #f0f0f0; padding: 2px; border-radius: 4px; font-family: \'Courier New\', monospace; color: #d63384; font-size: 10pt;">$1</span>');

    // 6. Global Newlines to <br>
    htmlBody = htmlBody.replace(/\n/g, '<br>');

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Gemini Export</title>
            <style>
                body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #000000; line-height: 1.5; }
                h1, h2, h3, h4, h5, h6 { font-family: 'Calibri Light', 'Arial', sans-serif; color: #0891b2; }
                strong, b { color: #0891b2; }
            </style>
        </head>
        <body>
            ${htmlBody}
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `Gemini_Chat_${timestamp}.doc`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
