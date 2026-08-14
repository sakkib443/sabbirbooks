'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiAward, FiDownload, FiEye, FiClock, FiLoader, FiCheckCircle, FiAlertCircle, FiImage } from 'react-icons/fi';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const CertificateViewer = dynamic(() => import('@/components/certificate/CertificateViewer'), { ssr: false });

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';

export default function UserCertificatesPage() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewCert, setViewCert] = useState(null);
    const [quickDownloading, setQuickDownloading] = useState(null);

    useEffect(() => { loadCertificates(); }, []);

    const loadCertificates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/certificate/my`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success) {
                setCertificates(data.data || []);
            }
        } catch (e) { console.error('Failed to load certificates:', e); }
        finally { setLoading(false); }
    };

    const activeCerts = certificates.filter(c => c.status === 'active');
    const pendingCerts = certificates.filter(c => c.status === 'pending');
    const revokedCerts = certificates.filter(c => c.status === 'revoked');

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Quick download PDF from card
    const quickDownloadPDF = async (cert) => {
        setQuickDownloading(cert._id || cert.id);
        try {
            // Create a temporary hidden certificate element
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            document.body.appendChild(tempDiv);

            // Import the viewer render function
            const { renderCertificateHTML } = await import('@/components/certificate/CertificateRenderer');
            tempDiv.innerHTML = renderCertificateHTML(cert);

            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(tempDiv.firstChild, {
                scale: 3, useCORS: true, backgroundColor: 'var(--dash-card)',
                width: 1120, height: 790,
            });

            const { jsPDF } = await import('jspdf');
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1120, 790] });
            pdf.addImage(imgData, 'PNG', 0, 0, 1120, 790);
            pdf.save(`${cert.id || 'certificate'}.pdf`);

            document.body.removeChild(tempDiv);
        } catch (e) {
            console.error(e);
            // Fallback: open the viewer
            setViewCert(cert);
        }
        setQuickDownloading(null);
    };

    return (
        <div className="poppins space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-dash-ink outfit">My Certificates</h1>
                <p className="text-sm text-dash-mute mt-1">View, download and verify your earned certificates</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Earned Certificates', value: activeCerts.length, icon: FiAward, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pending', value: pendingCerts.length, icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Total Issued', value: certificates.length, icon: FiCheckCircle, color: 'text-brand-ink', bg: 'bg-brand-soft' },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-dash-card rounded-xl border border-dash-line/60 p-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                                    <Icon className={`${s.color} text-xl`} />
                                </div>
                                <div>
                                    <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                                    <p className="text-sm text-dash-mute">{s.label}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Loading */}
            {loading ? (
                <div className="bg-dash-card rounded-2xl border border-dash-line/60 p-16 text-center shadow-sm">
                    <FiLoader className="animate-spin text-brand mx-auto mb-3" size={28} />
                    <p className="text-sm text-dash-mute2">Loading certificates...</p>
                </div>
            ) : (
                <>
                    {/* Active Certificates */}
                    <div className="bg-dash-card rounded-2xl border border-dash-line/60 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-dash-ink2 mb-6 flex items-center gap-2">
                            <FiAward className="text-brand" />
                            Earned Certificates
                        </h2>

                        {activeCerts.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiAward className="text-3xl text-amber-500" />
                                </div>
                                <h3 className="text-base font-semibold text-dash-ink3 mb-2">No Certificates Yet</h3>
                                <p className="text-dash-mute text-sm mb-6 max-w-md mx-auto">
                                    Complete your course to earn a certificate. Once your instructor grants eligibility, your certificate will appear here!
                                </p>
                                <Link href="/dashboard/user/courses"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-xl hover:shadow-lg transition text-sm">
                                    Browse My Courses
                                </Link>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {activeCerts.map(cert => (
                                    <div key={cert._id || cert.id} className="bg-gradient-to-br from-brand-soft/80 to-brand-soft/50 rounded-xl border border-emerald-200/60 p-5 hover:shadow-md transition-all group">
                                        {/* Certificate Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                    <FiAward size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-dash-ink2">{cert.courseName || 'Certificate'}</h3>
                                                    <p className="text-[11px] text-dash-mute">Batch: {cert.batchNumber || cert.batchId || '—'}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                ✓ Active
                                            </span>
                                        </div>

                                        {/* Certificate Details */}
                                        <div className="bg-dash-card/70 rounded-lg p-3 mb-3">
                                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                <div>
                                                    <p className="text-dash-mute2">Certificate ID</p>
                                                    <p className="text-dash-ink3 font-semibold font-mono">{cert.id}</p>
                                                </div>
                                                <div>
                                                    <p className="text-dash-mute2">Issue Date</p>
                                                    <p className="text-dash-ink3 font-semibold">{formatDate(cert.issueDate)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-dash-mute2">Student</p>
                                                    <p className="text-dash-ink3 font-semibold">{cert.studentName || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-dash-mute2">Duration</p>
                                                    <p className="text-dash-ink3 font-semibold">{formatDate(cert.startDate)} - {formatDate(cert.endDate)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setViewCert(cert)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-deep bg-brand-soft border border-brand-line rounded-lg hover:bg-brand-soft transition">
                                                <FiEye size={12} /> View Certificate
                                            </button>
                                            <button onClick={() => quickDownloadPDF(cert)} disabled={quickDownloading === (cert._id || cert.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-sm disabled:opacity-50">
                                                {quickDownloading === (cert._id || cert.id) ? <FiLoader className="animate-spin" size={12} /> : <FiDownload size={12} />} Download PDF
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Certificates */}
                    {pendingCerts.length > 0 && (
                        <div className="bg-dash-card rounded-2xl border border-dash-line/60 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-dash-ink2 mb-4 flex items-center gap-2">
                                <FiClock className="text-amber-500" />
                                Pending Certificates
                            </h2>
                            <div className="space-y-3">
                                {pendingCerts.map(cert => (
                                    <div key={cert._id || cert.id} className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-200/60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                                <FiClock className="text-amber-600" size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-dash-ink2">{cert.courseName || 'Certificate'}</h3>
                                                <p className="text-[11px] text-dash-mute">ID: {cert.id} • Batch: {cert.batchNumber || '—'}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                            ⏳ Pending
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Revoked */}
                    {revokedCerts.length > 0 && (
                        <div className="bg-dash-card rounded-2xl border border-dash-line/60 p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-dash-ink2 mb-4 flex items-center gap-2">
                                <FiAlertCircle className="text-red-500" />
                                Revoked Certificates
                            </h2>
                            <div className="space-y-3">
                                {revokedCerts.map(cert => (
                                    <div key={cert._id || cert.id} className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl border border-red-200/60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                                <FiAlertCircle className="text-red-500" size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-dash-ink2">{cert.courseName || 'Certificate'}</h3>
                                                <p className="text-[11px] text-dash-mute">ID: {cert.id}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                                            Revoked
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* How It Works */}
                    {certificates.length === 0 && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <FiClock className="text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-blue-900 text-sm">How Certificates Work</h4>
                                    <p className="text-sm text-blue-700 mt-1">
                                        Your instructor or training manager will grant your certificate once you complete the course requirements.
                                        You will receive a notification when your certificate is ready. You can then view, download as PDF or PNG directly from here.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Certificate Viewer Modal */}
            {viewCert && (
                <CertificateViewer certificate={viewCert} onClose={() => setViewCert(null)} />
            )}
        </div>
    );
}
