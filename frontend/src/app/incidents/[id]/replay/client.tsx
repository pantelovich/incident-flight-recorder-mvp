'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchIncidentReplay, fetchIncidentDetails } from '@/lib/api';
import { format, differenceInSeconds } from 'date-fns';
import { Play, Pause, FastForward, SkipBack, CircleAlert, CheckCircle2, ShieldAlert, Cpu, Activity } from 'lucide-react';
import Link from 'next/link';

export default function ReplayClient({ id }: { id: string }) {
    const [replay, setReplay] = useState<any>(null);
    const [incident, setIncident] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    useEffect(() => {
        async function init() {
            try {
                const [repData, incData] = await Promise.all([
                    fetchIncidentReplay(id),
                    fetchIncidentDetails(id)
                ]);
                setReplay(repData);
                setIncident(incData);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        init();
    }, [id]);

    // Timeline simulation logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setProgress(p => {
                    if (p >= 100) {
                        setIsPlaying(false);
                        return 100;
                    }
                    return p + (0.5 * playbackSpeed);
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackSpeed]);

    const allEvents = useMemo(() => {
        if (!replay || !replay.buckets) return [];
        const evts: any[] = [];
        replay.buckets.forEach((b: any) => {
            b.events.forEach((e: any) => evts.push({ ...e, phase: b.phase }));
        });
        return evts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [replay]);

    if (isLoading) {
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mt-20"></div>;
    }

    if (!replay || !incident) {
        return <div className="text-white">Replay data unavailable.</div>;
    }

    // Calculate simulated current time based on progress slider
    const totalDurationMs = new Date(incident.end_time || Date.now()).getTime() - new Date(incident.start_time).getTime();
    const currentSimulatedTimeMs = new Date(incident.start_time).getTime() + ((progress / 100) * totalDurationMs);
    const currentSimulatedDate = new Date(currentSimulatedTimeMs);

    // Filter events up to current simulated time
    const visibleEvents = allEvents.filter(e => new Date(e.timestamp).getTime() <= currentSimulatedTimeMs);
    const currentPhase = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1].phase : "pre-incident";

    // Find current active signals
    const activeErrors = visibleEvents.filter(e => e.event_type.includes('error') || e.event_type.includes('crash'));
    const hasRecovered = visibleEvents.some(e => e.event_type.includes('recover'));

    let systemStateClass = "border-slate-800 bg-slate-900";
    let systemStateText = "Stable";
    if (currentPhase === 'onset' || currentPhase === 'escalation') {
        systemStateClass = "border-red-900/50 bg-red-950/20";
        systemStateText = "Critical Failure";
    } else if (currentPhase === 'mitigation') {
        systemStateClass = "border-orange-900/50 bg-orange-950/20";
        systemStateText = "Under Investigation / Mitigating";
    } else if (currentPhase === 'recovery' || hasRecovered) {
        systemStateClass = "border-green-900/50 bg-green-950/20";
        systemStateText = "Recovered";
    }

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex justify-between items-center mb-2 shrink-0">
                <div>
                    <div className="text-slate-400 text-sm mb-1">
                        <Link href={`/incidents/${id}`} className="hover:text-white transition-colors">← Back to Incident</Link>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        Flight Replay
                        <span className="text-sm font-normal text-slate-400 px-2 py-1 bg-slate-800 rounded-md border border-slate-700">
                            {incident.title}
                        </span>
                    </h1>
                </div>

                <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 transition-colors duration-500 ${systemStateClass}`}>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">System State</span>
                        <span className="text-sm font-semibold text-white">{systemStateText}</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${systemStateText === 'Stable' || systemStateText === 'Recovered' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' :
                        systemStateText === 'Critical Failure' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse' :
                            'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse'
                        }`}></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">

                {/* Left Column: Metrics & Current State */}
                <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">Replay Controls</h3>
                        <div className="text-center mb-4">
                            <div className="text-2xl font-mono text-white bg-slate-950 py-2 border border-slate-800 rounded border-b-2 border-b-slate-700">
                                {format(currentSimulatedDate, 'HH:mm:ss')}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{format(currentSimulatedDate, 'MMM dd, yyyy')}</div>
                        </div>

                        <div className="flex justify-center gap-2 mb-6">
                            <button
                                onClick={() => setProgress(0)}
                                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white"
                                title="Restart"
                            >
                                <SkipBack className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/20"
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Speed: {playbackSpeed}x</span>
                                <div className="flex gap-1">
                                    {[1, 2, 5].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setPlaybackSpeed(s)}
                                            className={`px-2 py-0.5 rounded ${playbackSpeed === s ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700'}`}
                                        >
                                            {s}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.1"
                                value={progress}
                                onChange={(e) => {
                                    setProgress(parseFloat(e.target.value));
                                    setIsPlaying(false);
                                }}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" /> Live Signals
                        </h3>
                        {visibleEvents.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">Awaiting telemetry...</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <div className="text-xs text-slate-400 uppercase">Current Phase</div>
                                    <div className="text-lg font-medium text-white capitalize">{currentPhase}</div>
                                </div>

                                {activeErrors.length > 0 && !hasRecovered && (
                                    <div className="bg-red-950/30 p-3 rounded-lg border border-red-900/50 text-red-200 text-sm flex items-start gap-2">
                                        <CircleAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                                        <span>
                                            <strong>{activeErrors.length}</strong> critical errors logged in current window.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Interactive Timeline Log */}
                <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-[#0f172a] overflow-hidden flex flex-col shadow-inner">
                    <div className="border-b border-slate-800 bg-slate-900 p-3 flex justify-between items-center text-sm shrink-0">
                        <span className="font-medium text-slate-300">Terminal Output / Event Stream</span>
                        <span className="text-slate-500 text-xs">{visibleEvents.length} events processed</span>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto font-mono text-sm custom-scrollbar flex flex-col gap-1.5" id="event-stream">
                        {visibleEvents.map((event, idx) => {
                            const isError = event.event_type.includes('error') || event.event_type.includes('crash');
                            const isAlert = event.event_type.includes('alert');
                            const isRecover = event.event_type.includes('recover') || event.event_type.includes('resolve');
                            const isDeploy = event.event_type.includes('deploy') || event.event_type.includes('config');

                            let textColor = "text-slate-400";
                            let bgColor = "hover:bg-slate-800/50";

                            if (isError) { textColor = "text-red-400"; bgColor = "bg-red-950/10 hover:bg-red-950/30 border border-red-900/20"; }
                            else if (isAlert) { textColor = "text-orange-400"; bgColor = "bg-orange-950/10 hover:bg-orange-950/30 border border-orange-900/20"; }
                            else if (isDeploy) { textColor = "text-blue-400"; bgColor = "bg-blue-950/10 hover:bg-blue-950/30 border border-blue-900/20"; }
                            else if (isRecover) { textColor = "text-green-400"; bgColor = "bg-green-950/10 hover:bg-green-950/30 border border-green-900/20"; }

                            // Only animate the newly added ones
                            const isRecent = idx === visibleEvents.length - 1 && isPlaying;

                            return (
                                <div key={event.id} className={`p-2 rounded flex gap-4 transition-all duration-300 ${bgColor} ${isRecent ? 'animate-pulse ring-1 ring-slate-700' : ''}`}>
                                    <span className="text-slate-600 shrink-0 w-20">{format(new Date(event.timestamp), 'HH:mm:ss')}</span>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-semibold ${textColor}`}>{event.event_type}</span>
                                            <span className="px-1.5 py-0.5 bg-slate-900 rounded text-[10px] text-slate-500 border border-slate-800">
                                                {event.source_type}
                                            </span>
                                            {event.actor_id && (
                                                <span className="px-1.5 py-0.5 bg-slate-900 rounded text-[10px] text-zinc-500 border border-slate-800 font-sans">
                                                    Actor: {event.actor_id}
                                                </span>
                                            )}
                                        </div>
                                        {event.message && <span className="text-slate-300 mt-1">{event.message}</span>}
                                        {event.event_metadata && Object.keys(event.event_metadata).length > 0 && (
                                            <div className="mt-1 text-xs text-slate-600 bg-slate-950/50 p-2 rounded w-fit border border-slate-800/50">
                                                {JSON.stringify(event.event_metadata)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {!isLoading && visibleEvents.length === 0 && (
                            <div className="flex items-center justify-center h-full text-slate-600 font-sans italic">
                                Awaiting events. Press Play to start simulation.
                            </div>
                        )}

                        {/* Auto-scroll anchor */}
                        <div style={{ float: "left", clear: "both" }}
                            ref={(el) => { el?.scrollIntoView({ behavior: 'smooth' }); }}>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
