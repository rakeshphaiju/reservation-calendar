import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import Footer from '../components/header/Footer';

export default function PrivacyPage() {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios
            .get('/docs/privacy-policy.md')
            .then((res) => setContent(res.data))
            .catch(() => setError('Failed to load content.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
                {loading && (
                    <p className="text-sm text-slate-500">Loading...</p>
                )}
                {error && (
                    <p className="text-sm text-rose-500">{error}</p>
                )}
                {!loading && !error && (
                    <article className="prose prose-slate max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                    </article>
                )}
            </main>
            <Footer />
        </div>
    );
}