export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchIncidents() {
    const res = await fetch(`${API_BASE_URL}/incidents`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch incidents");
    return res.json();
}

export async function fetchIncidentDetails(id: string) {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch incident");
    return res.json();
}

export async function fetchIncidentEvents(id: string) {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/events`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
}

export async function fetchIncidentReplay(id: string) {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/replay`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch replay data");
    return res.json();
}

export async function summarizeIncident(id: string) {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/summarize`, {
        method: 'POST',
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to generate summary");
    return res.json();
}

export async function generateDemoData() {
    const res = await fetch(`${API_BASE_URL}/demo`, { method: 'POST' });
    if (!res.ok) throw new Error("Failed to generate demo data");
    return res.json();
}

export async function exportIncident(id: string) {
    const res = await fetch(`${API_BASE_URL}/incidents/${id}/export`);
    if (!res.ok) throw new Error("Failed to export incident");
    return res.json();
}
