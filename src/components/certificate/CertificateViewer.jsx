'use client';

import React, { useRef, useState } from 'react';
import { FiX, FiDownload, FiImage, FiLoader } from 'react-icons/fi';
import { renderCertificateHTML } from './CertificateRenderer';

export default function CertificateViewer({ certificate, onClose }) {
    const certRef = useRef(null);
    const [downloading, setDownloading] = useState(null);

    if (!certificate) return null;

    const capture = async () => {
        const html2canvas = (await import('html2canvas')).default;
        return html2canvas(certRef.current, {
            scale: 3, useCORS: true, backgroundColor: '#ffffff', width: 1120, height: 790,
        });
    };

    const handleDownloadPNG = async () => {
        setDownloading('png');
        try {
            const canvas = await capture();
            const link = document.createElement('a');
            link.download = `${certificate.id || 'certificate'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) { console.error(e); alert('Download failed'); }
        setDownloading(null);
    };

    const handleDownloadPDF = async () => {
        setDownloading('pdf');
        try {
            const canvas = await capture();
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1120, 790] });
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 1120, 790);
            pdf.save(`${certificate.id || 'certificate'}.pdf`);
        } catch (e) { console.error(e); alert('PDF download failed'); }
        setDownloading(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-[1200px] w-full max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10 rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Certificate</h3>
                        <p className="text-xs text-slate-400 font-mono">{certificate.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleDownloadPNG} disabled={downloading === 'png'}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#a5680f] bg-[#FEF6E7] border border-[#F0DFB4] rounded-lg hover:bg-[#f5e8cb] transition disabled:opacity-50">
                            {downloading === 'png' ? <FiLoader className="animate-spin" size={12} /> : <FiImage size={12} />} PNG
                        </button>
                        <button onClick={handleDownloadPDF} disabled={downloading === 'pdf'}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#F3A522] to-[#d88f13] rounded-lg hover:shadow-md transition shadow-sm disabled:opacity-50">
                            {downloading === 'pdf' ? <FiLoader className="animate-spin" size={12} /> : <FiDownload size={12} />} PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
                            <FiX size={18} />
                        </button>
                    </div>
                </div>

                {/* Certificate (single source of truth = renderCertificateHTML) */}
                <div className="p-6 flex justify-center bg-slate-50/50 overflow-x-auto">
                    <div ref={certRef} dangerouslySetInnerHTML={{ __html: renderCertificateHTML(certificate) }} />
                </div>
            </div>
        </div>
    );
}
