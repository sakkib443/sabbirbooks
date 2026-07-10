'use client';

/**
 * Reusable toast — replaces native alert() with a clean bottom-right popup.
 *
 *   const { showToast, toastNode } = useToast();
 *   showToast('success', 'Saved!');   // types: 'success' | 'error' | 'info'
 *   return (<> ... {toastNode} </>);
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

function ToastView({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';
  const Icon = isError ? FiAlertCircle : isInfo ? FiInfo : FiCheckCircle;
  return (
    <div
      className={`fixed bottom-6 right-6 z-[120] flex items-center gap-3 pl-4 pr-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold max-w-sm
        ${isError ? 'bg-red-600 text-white' : 'bg-[#14100c] text-white'}`}
      role="status"
    >
      <Icon className={isError ? 'text-white' : 'text-[#F3A522]'} size={18} />
      <span>{toast.message}</span>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return { showToast, toastNode: <ToastView toast={toast} /> };
}

export default ToastView;
