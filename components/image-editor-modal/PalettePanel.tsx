
import React from 'react';
import { ColorPicker } from './ColorPicker';
import { useLanguage } from '../../localization';

interface PalettePanelProps {
    color: string;
    onChange: (color: string) => void;
}

export const PalettePanel: React.FC<PalettePanelProps> = ({ color, onChange }) => {
    const { t } = useLanguage();

    return (
        <div className="w-64 bg-gray-900 border-l border-gray-700 flex flex-col flex-shrink-0 p-4 overflow-y-auto select-none">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Palette & Color</h3>
            <ColorPicker color={color} onChange={onChange} />
            
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-xs text-gray-400">
                <p className="mb-2 font-semibold text-gray-300">Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Use the <strong>Eyedropper</strong> tool to pick colors from the image.</li>
                    <li>Hold <strong>Alt</strong> while drawing to pick color temporarily.</li>
                </ul>
            </div>
        </div>
    );
};
