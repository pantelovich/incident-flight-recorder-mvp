import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Incident Details',
};

export default function IncidentDetailsWrapper({ params }: { params: { id: string } }) {
    // Simple wrapper that forces client-side rendering internally if needed, 
    // but for MVP, we'll just implement the page directly as a client component 
    // because we are lazy loading data via useEffect.
    return <IncidentDetailsClient id={params.id} />;
}

import IncidentDetailsClient from './client';
