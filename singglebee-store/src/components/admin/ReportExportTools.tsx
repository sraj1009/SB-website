"use client";

import { useState } from "react";
import { Download, FileText, PieChart, Activity, Loader2 } from "lucide-react";

export default function ReportExportTools() {
    const [exporting, setExporting] = useState<string | null>(null);

    const handleExport = async (type: string, timeframe?: string) => {
        setExporting(`${type}-${timeframe || ""}`);
        try {
            const params = new URLSearchParams({ type });
            if (timeframe) params.set("timeframe", timeframe);

            const res = await fetch(`/api/admin/reports?${params.toString()}`);
            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const contentDisposition = res.headers.get("Content-Disposition");
            const fileName = contentDisposition
                ? contentDisposition.split("filename=")[1]
                : `${type}-report.csv`;

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error(err);
            alert("Failed to export report. Please try again.");
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Export */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm group hover:border-amber-200 transition-all">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                        <PieChart className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Financial Reports</h3>
                        <p className="text-sm text-gray-400 font-medium">Download transaction and revenue data</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {["7days", "30days", "year"].map((t) => (
                        <button
                            key={t}
                            disabled={!!exporting}
                            onClick={() => handleExport("sales", t)}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-700 transition-all disabled:opacity-50"
                        >
                            {exporting === `sales-${t}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {t === "30days" ? "Last 30 Days" : t === "7days" ? "Last 7 Days" : "Last Year"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Inventory Export */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm group hover:border-amber-200 transition-all">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Inventory Status</h3>
                        <p className="text-sm text-gray-400 font-medium">Export current stock levels and alerts</p>
                    </div>
                </div>

                <button
                    disabled={!!exporting}
                    onClick={() => handleExport("inventory")}
                    className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-black hover:gap-4 transition-all disabled:opacity-50"
                >
                    {exporting === "inventory-" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Download Full Inventory Log (CSV)
                </button>
            </div>
        </div>
    );
}
