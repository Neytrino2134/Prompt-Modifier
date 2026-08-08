const fs = require('fs');
const content = fs.readFileSync('hooks/gemini/useEditorNode.ts', 'utf8');
const newContent = content.replace(
    /        \/\/ Validation - Relaxed for text-only potential\s+if \(!parsed\.isSequentialEditingWithPrompts\) \{\s+\/\/ Standard modes require Input A\s+if \(allInputImages\.length === 0 && parsed\.model !== 'gemini-3-pro-image-preview'\) \{\s+setError\("No input image provided for editing\."\);\s+return;\s+\}\s+\}/,
    `        // Validation - Relaxed for text-only potential
        if (!parsed.isSequentialEditingWithPrompts) {
             const genericTextsForCheck = textInputs.filter(t => !t.trim().startsWith('{') && !t.trim().startsWith('['));
             const hasPrompt = !!(parsed.prompt || genericTextsForCheck.length > 0);
             if (allInputImages.length === 0 && parsed.model !== 'gemini-3-pro-image-preview' && !hasPrompt) {
                 setError("No input image or prompt provided for generation/editing.");
                 return;
             }
        }`
);
fs.writeFileSync('hooks/gemini/useEditorNode.ts', newContent);
