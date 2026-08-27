'use client';

import React, { useState } from 'react';
import { FiHelpCircle, FiMessageCircle, FiPhone, FiMail, FiClock, FiChevronDown, FiChevronUp, FiExternalLink, FiLoader, FiSend } from 'react-icons/fi';

export default function UserSupportPage() {
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [ticketForm, setTicketForm] = useState({
        subject: '',
        category: 'general',
        message: '',
    });

    const faqs = [
        {
            id: 1,
            question: 'How do I enroll in a course?',
            answer: 'To enroll in a course, browse our course catalog, select the course you want, and click the "Enroll Now" button. Complete the payment process to gain access to the course materials.',
        },
        {
            id: 2,
            question: 'How can I get my certificate?',
            answer: 'Certificates are automatically generated once you complete all the lessons and assignments in a course. You can download your certificate from the Certificates page in your dashboard.',
        },
        {
            id: 3,
            question: 'What payment methods are accepted?',
            answer: 'We accept bKash, Nagad, and major credit/debit cards. All payments are processed securely through our payment partners.',
        },
        {
            id: 4,
            question: 'Can I get a refund?',
            answer: 'Refund requests can be made within 7 days of purchase if you haven\'t completed more than 20% of the course. Contact our support team for refund requests.',
        },
        {
            id: 5,
            question: 'How do I contact my instructor?',
            answer: 'You can contact your instructor through the course discussion forum or by using the messaging feature in your enrolled course page.',
        },
    ];

    const contactMethods = [
        {
            icon: FiPhone,
            title: 'Phone Support',
            value: '01799075202',
            subtext: 'Mon-Fri, 9AM-6PM',
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
        },
        {
            icon: FiMail,
            title: 'Email Support',
            value: 'support@aptechlearning.com',
            subtext: '24-48 hours response',
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            icon: FiMessageCircle,
            title: 'Live Chat',
            value: 'Coming Soon',
            subtext: 'Real-time support',
            color: 'text-purple-600',
            bg: 'bg-purple-100',
        },
    ];

    const handleSubmitTicket = (e) => {
        e.preventDefault();
        alert('🔄 Support ticket system is processing. This feature will be available soon!');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dash-ink">Help & Support</h1>
                <p className="text-dash-mute text-sm mt-1">Get help with your courses and account</p>
            </div>

            {/* Contact Methods */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                {contactMethods.map((method, index) => {
                    const Icon = method.icon;
                    return (
                        <div
                            key={index}
                            className="bg-dash-card rounded-xl border border-dash-line p-5 hover:shadow-md hover:border-brand/30 transition"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl ${method.bg} flex items-center justify-center`}>
                                    <Icon className={method.color} size={22} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-dash-ink2">{method.title}</h3>
                                    <p className="text-sm text-dash-ink3 font-medium mt-1">{method.value}</p>
                                    <p className="text-xs text-dash-mute mt-0.5">{method.subtext}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* FAQs */}
                <div className="bg-dash-card rounded-2xl border border-dash-line p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-dash-ink2 mb-6 flex items-center gap-2">
                        <FiHelpCircle className="text-brand" />
                        Frequently Asked Questions
                    </h2>

                    <div className="space-y-3">
                        {faqs.map((faq) => (
                            <div
                                key={faq.id}
                                className="border border-dash-line rounded-xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-dash-soft transition"
                                >
                                    <span className="font-medium text-dash-ink2">{faq.question}</span>
                                    {expandedFaq === faq.id ? (
                                        <FiChevronUp className="text-brand" />
                                    ) : (
                                        <FiChevronDown className="text-dash-mute2" />
                                    )}
                                </button>
                                {expandedFaq === faq.id && (
                                    <div className="px-4 pb-4 text-sm text-dash-ink4 border-t border-dash-line-soft pt-3">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* More Help Link */}
                    <a
                        href="/help"
                        className="mt-6 flex items-center justify-center gap-2 text-brand font-medium hover:underline"
                    >
                        View All FAQs
                        <FiExternalLink size={14} />
                    </a>
                </div>

                {/* Submit Ticket */}
                <div className="bg-dash-card rounded-2xl border border-dash-line p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-dash-ink2 mb-6 flex items-center gap-2">
                        <FiMessageCircle className="text-brand" />
                        Submit a Support Ticket
                    </h2>

                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-dash-ink3 mb-2">Subject</label>
                            <input
                                type="text"
                                value={ticketForm.subject}
                                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                                placeholder="Brief description of your issue"
                                className="w-full px-4 py-2.5 rounded-xl border border-dash-line focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-dash-ink3 mb-2">Category</label>
                            <select
                                value={ticketForm.category}
                                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-dash-line focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
                            >
                                <option value="general">General Inquiry</option>
                                <option value="course">Course Related</option>
                                <option value="payment">Payment Issue</option>
                                <option value="technical">Technical Problem</option>
                                <option value="certificate">Certificate Request</option>
                            </select>
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-sm font-medium text-dash-ink3 mb-2">Message</label>
                            <textarea
                                value={ticketForm.message}
                                onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                                placeholder="Describe your issue in detail..."
                                rows={5}
                                className="w-full px-4 py-2.5 rounded-xl border border-dash-line focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none resize-none"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-brand to-brand-hover text-white font-semibold rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                        >
                            <FiSend size={18} />
                            Submit Ticket
                        </button>
                    </form>

                    {/* Processing Notice */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <FiLoader className="text-blue-600 animate-spin" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-blue-900">Ticket System Processing</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Our ticket management system is being set up.
                                    For urgent issues, please contact us directly via phone or email.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
