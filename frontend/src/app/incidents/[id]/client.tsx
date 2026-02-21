'use client';

import { useState, useEffect } from 'react';
import { fetchIncidentDetails, summarizeIncident, exportIncident } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertCircle, Clock, ShieldAlert, Cpu, Activity, ServerCrash, PlayCircle, Download } from 'lucide-react';

export default function IncidentDetailsClient({ id }: { id: string }) {
    const [incident, setIncident] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const loadData = async () => {
        try {
            const data = await fetchIncidentDetails(id);
            setIncident(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleSummarize = async () => {
        setIsSummarizing(true);
        try {
            await summarizeIncident(id);
            await loadData();
        } catch (e) {
            alert("Summarization failed");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const data = await exportIncident(id);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `incident-${id}-postmortem.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Failed to export JSON report");
        } finally {
            setIsExporting(false);
        }
    }

    if (isLoading) {
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mt-20"></div>;
    }

    if (!incident) {
        return <div className="text-white">Incident not found</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${incident.severity <= 2 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                            }`}>
                            SEV-{incident.severity}
                        </span>
                        <span className="text-sm text-slate-400 capitalize bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                            {incident.status}
                        </span>
                        <span className="text-sm text-slate-400">Environment: {incident.environment}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">{incident.title}</h1>
                    <p className="text-slate-400 mt-2 max-w-3xl">{incident.description}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link href={`/incidents/${id}/replay`}>
                        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-10 py-2 px-4 shadow shadow-red-600/20">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Open Replay
                        </button>
                    </Link>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 h-10 py-2 px-4"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? 'Exporting...' : 'Export JSON'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {/* Left Column: Timeline & Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Incident Metadata</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500 flex items-center"><Clock className="w-4 h-4 mr-1" /> Start Time</p>
                                <p className="text-sm text-white">{format(new Date(incident.start_time), 'PP HH:mm:ss')}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500 flex items-center"><Clock className="w-4 h-4 mr-1" /> End Time</p>
                                <p className="text-sm text-white">{incident.end_time ? format(new Date(incident.end_time), 'PP HH:mm:ss') : 'Ongoing'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500">Duration</p>
                                <p className="text-sm text-white">
                                    {incident.end_time
                                        ? `${Math.round((new Date(incident.end_time).getTime() - new Date(incident.start_time).getTime()) / 60000)} mins`
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-500">Event Count</p>
                                <p className="text-sm text-white">{incident.events?.length || 0} events tracked</p>
                            </div>
                        </div>
                    </div>

                    {/* Summary / Analysis Panel */}
                    <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-white flex items-center">
                                <AlertCircle className="w-5 h-5 text-blue-400 mr-2" />
                                AI Analysis & Root Cause
                            </h2>
                            {!incident.summary && (
                                <button onClick={handleSummarize} disabled={isSummarizing} className="text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 px-3 py-1.5 rounded-md transition-colors font-medium">
                                    {isSummarizing ? "Analyzing..." : "Generate Analysis"}
                                </button>
                            )}
                        </div>

                        {incident.summary ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-2">Probable Root Cause</h3>
                                    <div className="bg-slate-900/80 rounded-lg p-4 border border-blue-900/50">
                                        <p className="text-slate-200 text-lg leading-relaxed">
                                            {incident.summary.probable_root_cause} (Confidence: {incident.summary.confidence_score * 100}%)
                                        </p>
                                    </div>
                                </div>

                                {incident.summary.causal_chain?.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-3 flex items-center"><Activity className="w-4 h-4 mr-1" /> Identified Causal Chain</h3>
                                        <div className="space-y-3 pl-2 border-l-2 border-slate-800 ml-2">
                                            {incident.summary.causal_chain.map((chainItem: any, i: number) => (
                                                <div key={i} className="relative pl-6">
                                                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[23px] top-1 ring-4 ring-slate-950"></div>
                                                    <p className="text-sm text-slate-300">{chainItem.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {incident.summary.recommendations?.length > 0 && (
                                    <div className="pt-4 border-t border-slate-800/50">
                                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-3 flex items-center"><ShieldAlert className="w-4 h-4 mr-1" /> Action Items</h3>
                                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                                            {incident.summary.recommendations.map((rec: string, i: number) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-slate-400 mb-4">No AI analysis generated yet for this incident.</p>
                                <button onClick={handleSummarize} disabled={isSummarizing} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 h-10 py-2 px-6">
                                    {isSummarizing ? "Analyzing timeline..." : "Run Root Cause Analysis"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Mini Timeline */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Recent Events</h2>
                    <div className="relative border-l border-slate-800 ml-3 space-y-6">
                        {incident.events?.slice(-10).reverse().map((event: any, i: number) => (
                            <div key={event.id} className="pl-6 relative">
                                <div className={`absolute w-2.5 h-2.5 rounded-full -left-[5px] top-1.5 ring-4 ring-slate-900 ${event.event_type.includes('error') || event.event_type.includes('crash') ? 'bg-red-500' :
                                        event.event_type.includes('alert') ? 'bg-orange-500' :
                                            event.event_type.includes('deploy') || event.event_type.includes('config') ? 'bg-blue-500' :
                                                event.event_type.includes('recover') ? 'bg-green-500' : 'bg-slate-500'
                                    }`}></div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-sm font-medium text-slate-200">{event.event_type}</span>
                                    <span className="text-xs text-slate-500">{format(new Date(event.timestamp), 'HH:mm:ss')}</span>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2">{event.message}</p>
                                <div className="flex items-center mt-2 gap-2 text-[10px] text-slate-500">
                                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{event.source_type}</span>
                                    {event.actor_id && <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{event.actor_id}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-800 text-center">
                        <Link href={`/incidents/${id}/replay`} className="text-sm text-blue-400 hover:text-blue-300">
                            View Full Interactive Replay →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
