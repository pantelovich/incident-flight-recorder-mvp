'use client';

import { useState, useEffect } from 'react';
import { fetchIncidents, generateDemoData } from '@/lib/api';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleGenerateDemo = async () => {
    setIsGenerating(true);
    try {
      await generateDemoData();
      await loadIncidents();
    } catch (error) {
      alert("Failed to generate demo data. Is backend running?");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <p className="text-slate-400 mt-1">Manage and replay recent system incidents.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleGenerateDemo}
            disabled={isGenerating}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-slate-800 text-white hover:bg-slate-700 h-10 py-2 px-4 shadow-sm"
          >
            {isGenerating ? 'Loading...' : 'Load Demo Dataset'}
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-red-600 text-white hover:bg-red-700 h-10 py-2 px-4 shadow hover:shadow-lg shadow-red-600/20">
            Simulate New Incident
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center shadow-sm">
          <h3 className="mt-2 text-lg font-semibold text-white">No incidents</h3>
          <p className="mt-1 text-sm text-slate-400">You haven't ingested any incidents yet.</p>
          <div className="mt-6">
            <button onClick={handleGenerateDemo} className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-700 bg-slate-800 hover:bg-slate-700 h-10 py-2 px-4 text-white">
              Load Demo Data
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {incidents.map((incident) => (
            <Link key={incident.id} href={`/incidents/${incident.id}`} className="block w-full h-full">
              <div className="group rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm transition-all hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-lg hover:-translate-y-1 block h-full flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${incident.severity <= 2 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                      }`}>
                      SEV-{incident.severity}
                    </span>
                    <span className="text-xs text-slate-400">
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold leading-none tracking-tight text-white mb-2">{incident.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">{incident.description}</p>
                </div>
                <div className="border-t border-slate-800 p-4 bg-slate-900/50 group-hover:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500 mt-auto shrink-0">
                  <span>Env: <span className="text-slate-300 font-medium">{incident.environment}</span></span>
                  <span>{formatDistanceToNow(new Date(incident.start_time), { addSuffix: true })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
