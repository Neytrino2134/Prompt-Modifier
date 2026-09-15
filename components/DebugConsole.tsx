import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { LogEntry, LogLevel } from '../types';
import { CopyIcon } from './icons/AppIcons';

export const DebugConsole: React.FC = () => {
    const context = useAppContext();
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | LogLevel>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!context) return null;
    const { logs, isDebugConsoleOpen, setIsDebugConsoleOpen, clearLogs } = context;

    // Filter and search
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (activeFilter !== 'all' && log.level !== activeFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchMsg = log.message.toLowerCase().includes(query);
                const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(query) : false;
                const matchLevel = log.level.toLowerCase().includes(query);
                return matchMsg || matchDetails || matchLevel;
            }
            return true;
        });
    }, [logs, activeFilter, searchQuery]);

    // Counts
    const counts = useMemo(() => {
        let errors = 0;
        let warnings = 0;
        let success = 0;
        let info = 0;
        logs.forEach(l => {
            if (l.level === 'error') errors++;
            else if (l.level === 'warning') warnings++;
            else if (l.level === 'success') success++;
            else info++;
        });
        return { all: logs.length, errors, warnings, success, info };
    }, [logs]);

    useEffect(() => {
        if (isDebugConsoleOpen && isAutoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [filteredLogs, isDebugConsoleOpen, isAutoScroll]);

    if (!isDebugConsoleOpen) return null;

    const copyLog = (entry: LogEntry) => {
        const text = `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.level.toUpperCase()}: ${entry.message}${entry.details ? '\n' + JSON.stringify(entry.details, null, 2) : ''}`;
        navigator.clipboard.writeText(text);
        setCopiedLogId(entry.id);
        setTimeout(() => setCopiedLogId(null), 1500);
    };

    const copyAllLogs = () => {
        const text = filteredLogs.map(entry => 
            `[${new Date(entry.timestamp).toLocaleTimeString()}] [${entry.level.toUpperCase()}] ${entry.message}${entry.details ? '\n' + JSON.stringify(entry.details, null, 2) : ''}`
        ).join('\n\n');
        navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    const getLevelBadge = (level: LogLevel) => {
        switch (level) {
            case 'error':
                return 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
            case 'warning':
                return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
            case 'success':
                return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
            case 'info':
            default:
                return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40';
        }
    };

    const getLevelRowBorder = (level: LogLevel) => {
        switch (level) {
            case 'error':
                return 'border-l-rose-500 bg-rose-950/20';
            case 'warning':
                return 'border-l-amber-500 bg-amber-950/20';
            case 'success':
                return 'border-l-emerald-500 bg-emerald-950/20';
            case 'info':
            default:
                return 'border-l-cyan-500 bg-cyan-950/15';
        }
    };

    return (
        <div 
            className="fixed bottom-[100px] left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 shadow-2xl rounded-xl flex flex-col z-[300] transition-all duration-300 w-[95vw] max-w-[1100px] overflow-hidden"
            style={{ height: isExpanded ? '82vh' : '360px' }}
        >
            {/* Header Bar */}
            <div 
                className="flex items-center justify-between px-3 py-2 bg-gray-800/90 border-b border-gray-700/80 select-none cursor-pointer" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        System Logs & Notifications
                    </span>
                    <span className="text-[11px] bg-gray-700/80 px-2 py-0.5 rounded-full text-gray-300 font-mono">
                        {logs.length} events
                    </span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Copy All Button */}
                    <button 
                        onClick={copyAllLogs} 
                        className="px-2 py-1 hover:bg-gray-700 rounded text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1 transition-colors" 
                        title="Copy Filtered Logs"
                    >
                        <CopyIcon className="h-3 w-3" />
                        <span>{copiedAll ? 'Copied!' : 'Copy All'}</span>
                    </button>

                    {/* Clear Button */}
                    <button 
                        onClick={clearLogs} 
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-rose-400 transition-colors" 
                        title="Clear Logs"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>

                    {/* Expand/Collapse Toggle */}
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)} 
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors" 
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded 
                            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        }
                    </button>

                    {/* Close Button */}
                    <button 
                        onClick={() => setIsDebugConsoleOpen(false)} 
                        className="p-1 hover:bg-rose-900/50 rounded text-gray-400 hover:text-rose-400 transition-colors" 
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-gray-950/60 border-b border-gray-800/80 text-xs">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            activeFilter === 'all' 
                                ? 'bg-accent text-white shadow-sm' 
                                : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        All ({counts.all})
                    </button>

                    <button
                        onClick={() => setActiveFilter('success')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                            activeFilter === 'success' 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-gray-800 text-emerald-400 hover:bg-emerald-950/40'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Success ({counts.success})
                    </button>

                    <button
                        onClick={() => setActiveFilter('info')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                            activeFilter === 'info' 
                                ? 'bg-cyan-600 text-white' 
                                : 'bg-gray-800 text-cyan-400 hover:bg-cyan-950/40'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Info ({counts.info})
                    </button>

                    <button
                        onClick={() => setActiveFilter('warning')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                            activeFilter === 'warning' 
                                ? 'bg-amber-600 text-white' 
                                : 'bg-gray-800 text-amber-400 hover:bg-amber-950/40'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Warnings ({counts.warnings})
                    </button>

                    <button
                        onClick={() => setActiveFilter('error')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                            activeFilter === 'error' 
                                ? 'bg-rose-600 text-white' 
                                : 'bg-gray-800 text-rose-400 hover:bg-rose-950/40'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Errors ({counts.errors})
                    </button>
                </div>

                {/* Search & Auto-scroll */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search logs..."
                            className="bg-gray-800/80 border border-gray-700/60 rounded px-2.5 py-0.5 text-[11px] text-gray-200 placeholder-gray-500 w-36 sm:w-48 focus:border-accent focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-[10px]"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <label className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-300 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isAutoScroll}
                            onChange={(e) => setIsAutoScroll(e.target.checked)}
                            className="rounded bg-gray-800 border-gray-700 text-accent focus:ring-0 w-3 h-3"
                        />
                        Auto-scroll
                    </label>
                </div>
            </div>

            {/* Logs List View */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-2 font-mono text-xs bg-[#0b0f19] custom-scrollbar space-y-1.5">
                {filteredLogs.length === 0 && (
                    <div className="text-gray-500 italic p-6 text-center flex flex-col items-center justify-center gap-2">
                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{searchQuery ? 'No matching logs found.' : 'No logs recorded.'}</span>
                    </div>
                )}

                {filteredLogs.map((log) => (
                    <div 
                        key={log.id} 
                        className={`p-2 rounded border-l-4 ${getLevelRowBorder(log.level)} hover:bg-gray-800/40 transition-colors group relative border-t border-r border-b border-gray-800/50`}
                    >
                        <div className="flex justify-between items-start gap-2">
                            <span className="text-gray-500 shrink-0 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${getLevelBadge(log.level)}`}>
                                {log.level}
                            </span>
                            <span className="flex-grow text-gray-200 break-words whitespace-pre-wrap leading-relaxed">
                                {log.message}
                            </span>
                            <button 
                                onClick={() => copyLog(log)} 
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1 hover:bg-gray-700/60 rounded shrink-0 cursor-pointer"
                                title="Copy log entry"
                            >
                                {copiedLogId === log.id ? (
                                    <span className="text-[10px] text-emerald-400 font-bold">✓ Copied</span>
                                ) : (
                                    <CopyIcon className="h-3 w-3" />
                                )}
                            </button>
                        </div>
                        {log.details && (
                            <div className="mt-1.5 ml-14 text-gray-300 bg-black/40 p-2 rounded border border-gray-800/80 overflow-x-auto font-mono text-[11px]">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DebugConsole;
