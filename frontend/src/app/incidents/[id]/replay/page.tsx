import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Incident Replay',
};

export default async function ReplayWrapper({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ReplayClient id={id} />;
}

import ReplayClient from './client';
