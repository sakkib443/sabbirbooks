'use client';

/**
 * Reusable confirm dialog — replaces native confirm() with a styled modal.
 *
 *   const { confirm, confirmNode } = useConfirm();
 *   if (!(await confirm({ title: 'Delete this item?', confirmText: 'Delete' }))) return;
 *   return (<> ... {confirmNode} </>);
 */

import React, { useState, useCallback, useRef } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

export function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        danger: opts.danger ?? true,
      });
    });
  }, []);

  const settle = (result) => {
    setState(null);
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  };

  const confirmNode = state ? (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => settle(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[popIn_0.18s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${state.danger ? 'bg-red-50 text-red-500' : 'bg-[#FEF6E7] text-[#F3A522]'}`}>
            <FiAlertTriangle size={26} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 outfit">{state.title}</h3>
          {state.message && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{state.message}</p>}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={() => settle(false)}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
          >
            {state.cancelText}
          </button>
          <button
            onClick={() => settle(true)}
            className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition ${state.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#41bfb8] hover:bg-[#38a89d]'}`}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  ) : null;

  return { confirm, confirmNode };
}

export default useConfirm;
