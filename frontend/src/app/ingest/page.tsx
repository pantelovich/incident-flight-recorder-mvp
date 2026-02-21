'use client';

import { useState, useEffect } from 'react';
import { fetchIncidents, API_BASE_URL } from '@/lib/api';
import { Database, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function IngestPage() {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [selectedIncident, setSelectedIncident] = useState<string>('new');
    const [newIncidentTitle, setNewIncidentTitle] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

    useEffect(() => {
        fetchIncidents().then(setIncidents).catch(console.error);
    }, []);

    const handleIngest = async () => {
        setStatus({ type: 'loading', message: 'Parsing and ingesting events...' });

        try {
            // 1. Parse JSON
            let parsedEvents;
            try {
                parsedEvents = JSON.parse(jsonInput);
                if (!Array.isArray(parsedEvents)) {
                    throw new Error("Input must be a JSON array of event objects.");
                }
            } catch (e: any) {
                setStatus({ type: 'error', message: `Invalid JSON: ${e.message}` });
                return;
            }

            // 2. Either use existing incident or create new
            let targetIncidentId = selectedIncident;

            if (selectedIncident === 'new') {
                if (!newIncidentTitle.trim()) {
                    setStatus({ type: 'error', message: 'Please provide a title for the new incident.' });
                    return;
                }

                const createRes = await fetch(`${API_BASE_URL}/incidents`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: newIncidentTitle,
                        environment: 'prod',
                        severity: 3
                    })
                });

                if (!createRes.ok) throw new Error("Failed to create new incident");
                const newInc = await createRes.json();
                targetIncidentId = newInc.id;
            }

            // 3. Ingest Events
            const ingestRes = await fetch(`${API_BASE_URL}/incidents/${targetIncidentId}/events/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedEvents)
            });

            if (!ingestRes.ok) {
                const errObj = await ingestRes.json();
                throw new Error(errObj.detail || "Failed to ingest events");
            }

            const result = await ingestRes.json();
            setStatus({ type: 'success', message: `Success! ${result.count} events ingested to incident.` });
            setJsonInput('');

            // reload available incidents
            fetchIncidents().then(setIncidents);

        } catch (error: any) {
            setStatus({ type: 'error', message: error.message });
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pt-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Database className="w-8 h-8 text-blue-500" />
                    Raw Event Ingestion
                </h1>
                <p className="text-slate-400 mt-2">Paste an array of JSON telemetry events to ingest them into the incident flight recorder.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 space-y-6">

                    {/* Incident Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Target Incident</label>
                        <select
                            value={selectedIncident}
                            onChange={(e) => setSelectedIncident(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="new">+ Create New Incident</option>
                            {incidents.map(inc => (
                                <option key={inc.id} value={inc.id}>{inc.title} ({new Date(inc.start_time).toLocaleDateString()})</option>
                            ))}
                        </select>
                    </div>

                    {selectedIncident === 'new' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">New Incident Title</label>
                            <input
                                type="text"
                                value={newIncidentTitle}
                                onChange={e => setNewIncidentTitle(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-600"
                                placeholder="e.g. Checkout Service Outage"
                            />
                        </div>
                    )}

                    {/* JSON Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex justify-between items-center">
                            <span>Event Payload (JSON Array)</span>
                            <span className="text-xs text-slate-500 font-mono">[{`{ timestamp, source_type, event_type, ... }`}]</span>
                        </label>
                        <textarea
                            value={jsonInput}
                            onChange={e => setJsonInput(e.target.value)}
                            className="w-full h-64 bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-300 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none custom-scrollbar"
                            placeholder={`[\n  {\n    "timestamp": "2024-05-10T12:00:00Z",\n    "source_type": "app",\n    "event_type": "error_spike",\n    "message": "High latency observed"\n  }\n]`}
                            spellCheck="false"
                        />
                    </div>

                    {/* Status Messages */}
                    {status.type !== 'idle' && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${status.type === 'error' ? 'bg-red-950/30 border border-red-900/50 text-red-200' :
                                status.type === 'success' ? 'bg-green-950/30 border border-green-900/50 text-green-200' :
                                    'bg-blue-950/30 border border-blue-900/50 text-blue-200'
                            }`}>
                            {status.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                            {status.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                            {status.type === 'loading' && <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>}
                            <div className="text-sm font-medium">{status.message}</div>
                        </div>
                    )}

                </div>
                <div className="bg-slate-900/50 border-t border-slate-800 p-4 flex justify-end">
                    <button
                        onClick={handleIngest}
                        disabled={status.type === 'loading' || !jsonInput.trim()}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 py-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileJson className="w-4 h-4 mr-2" />
                        Ingest Events
                    </button>
                </div>
            </div>
        </div>
    );
}
