import React from "react";

interface PolicyLayoutProps {
    title: string;
    lastUpdated: string;
    children: React.ReactNode;
}

export default function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fadeIn">
            <div className="mb-12 text-center text-balance">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
                <p className="text-gray-500 font-medium">Last Updated: {lastUpdated}</p>
            </div>

            <div className="prose prose-amber max-w-none text-gray-600 leading-relaxed space-y-8">
                {children}
            </div>

            <div className="mt-16 pt-8 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-400">
                    If you have any questions about this {title.toLowerCase()}, please contact us at{" "}
                    <a href="mailto:singglebee.rsventures@gmail.com" className="text-amber-600 hover:underline">
                        singglebee.rsventures@gmail.com
                    </a>
                </p>
            </div>
        </div>
    );
}
