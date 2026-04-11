import React from 'react';
import { Link } from 'react-router-dom';

function XIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M18.244 2H21l-6.52 7.45L22.147 22h-6.004l-4.7-6.146L6.06 22H3.3l6.973-7.967L2 2h6.157l4.248 5.608L18.244 2Zm-1.052 18h1.526L7.33 3.894H5.693L17.192 20Z" />
        </svg>
    );
}

function LinkedInIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M6.94 8.5H3.56V19h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.3 6.94 1.97 1.97 0 0 0 5.25 3ZM20.44 12.38c0-3.14-1.67-4.6-3.9-4.6-1.8 0-2.6.99-3.05 1.68V8.5h-3.38c.04.64 0 10.5 0 10.5h3.38v-5.86c0-.31.02-.63.11-.85.25-.63.82-1.28 1.78-1.28 1.26 0 1.76.96 1.76 2.37V19H20.5v-6.62h-.06Z" />
        </svg>
    );
}

export default function Footer() {
    return (
        <footer className="px-4 py-6 text-sm text-slate-500 mt-auto">
            <div className="mx-auto max-w-5xl">
                {/* Horizontal line */}
                <div className="border-t border-slate-200 mb-6"></div>

                {/* Footer content */}
                <div className="flex items-center justify-center gap-4">
                    <Link to="/privacy" className="hover:text-slate-900">
                        Privacy
                    </Link>

                    <Link to="/terms" className="hover:text-slate-900">
                        Terms
                    </Link>

                    <a
                        href="https://x.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Booking Nest on X"
                        className="hover:text-slate-900"
                    >
                        <XIcon />
                    </a>

                    <a
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Booking Nest on LinkedIn"
                        className="hover:text-slate-900"
                    >
                        <LinkedInIcon />
                    </a>
                </div>
            </div>
        </footer>
    );
}