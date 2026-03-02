import { Metadata } from 'next';
import PreviewClient from './PreviewClient';

export const metadata: Metadata = {
    title: 'Creator Preview | Revelio',
    description: 'Preview your puzzle before sharing it with friends.',
};

export default function PreviewPage() {
    return <PreviewClient />;
}
