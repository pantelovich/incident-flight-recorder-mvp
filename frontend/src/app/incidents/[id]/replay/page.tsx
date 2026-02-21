import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Incident Replay',
};

export default function ReplayWrapper({ params }: { params: { id: string } }) {
    return <ReplayClient id={params.id} />;
}

import ReplayClient from './client';
