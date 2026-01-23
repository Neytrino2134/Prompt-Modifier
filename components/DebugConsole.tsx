
import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { LogEntry } from '../types';
import { CopyIcon } from './icons/AppIcons';

export const DebugConsole: React.FC = () => {
    const context = useAppContext();
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!context) return null;
    const { logs, isDebugConsoleOpen, setIsDebugConsoleOpen, clearLogs } = context;

    useEffect(() => {
        if (isDebugConsoleOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isDebugConsoleOpen]);

    if (!isDebugConsoleOpen) return null;

    const copyLog = (entry: LogEntry) => {
        const text = `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.level.toUpperCase()}: ${entry.message}\n${entry.details ? JSON.stringify(entry.details, null, 2) : ''}`;
        navigator.clipboard.writeText(text);
    };

    return (
        <div 
            className={`fixed bottom-[100px] left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 shadow-2xl rounded-t-lg flex flex-col z-[300] transition-all duration-300 w-full max-w-[1040px]`}
            style={{ height: isExpanded ? '80vh' : '300px' }}
        >
            <div className="flex items-center justify-between p-2 bg-gray-800 rounded-t-lg border-b border-gray-700 select-none cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        System Logs
                    </span>
                    <span className="text-[10px] bg-gray-700 px-1.5 rounded text-gray-400">{logs.length} events</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); clearLogs(); }} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Clear">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title={isExpanded ? "Collapse" : "Expand"}>
                        {isExpanded 
                            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        }
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsDebugConsoleOpen(false); }} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-2 font-mono text-xs bg-[#0d1117] custom-scrollbar space-y-1">
                {logs.length === 0 && <div className="text-gray-600 italic p-2 text-center">No logs recorded.</div>}
                {logs.map((log) => (
                    <div key={log.id} className={`p-2 rounded border-l-2 ${log.level === 'error' ? 'border-red-500 bg-red-900/10' : log.level === 'warning' ? 'border-yellow-500 bg-yellow-900/10' : 'border-blue-500 bg-blue-900/10'} hover:bg-gray-800/50 transition-colors group relative`}>
                        <div className="flex justify-between items-start">
                            <span className="text-gray-500 shrink-0 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`font-bold shrink-0 mr-2 ${log.level === 'error' ? 'text-red-400' : log.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>[{log.level.toUpperCase()}]</span>
                            <span className="flex-grow text-gray-300 break-words whitespace-pre-wrap">{log.message}</span>
                            <button onClick={() => copyLog(log)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity ml-2">
                                <CopyIcon className="h-3 w-3" />
                            </button>
                        </div>
                        {log.details && (
                            <div className="mt-1 ml-16 text-gray-400 bg-black/30 p-2 rounded overflow-x-auto">
                                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
