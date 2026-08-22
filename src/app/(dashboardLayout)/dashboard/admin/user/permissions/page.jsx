'use client';

/**
 * Manager permission matrix.
 *
 * Rows = the manager accounts, columns = capabilities. Ticking a box PATCHes
 * /api/user/:id/permissions, which is the only endpoint that can write the
 * `permissions` field, and is itself behind `staff.manage` — a capability that
 * cannot be granted. So a manager can never open this page and never edit
 * anyone, including themselves.
 *
 * The column list is NOT hardcoded here: it comes from
 * GET /api/user/permissions/catalog, i.e. straight out of the same
 * app/config/permissions.ts the API routes enforce. If a capability is added
 * server-side it appears here automatically, and it can never show a toggle the
 * server does not honour.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiShield, FiUsers, FiSave, FiCheck, FiRotateCcw,
  FiAlertCircle, FiInfo, FiUserPlus,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { ROLE_LABELS, getStoredUser } from '@/lib/permissions';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const jhdr = () => ({ 'Content-Type': 'application/json', ...hdr() });

const ROLE_BLURB = {
  trainingManager:
    'Runs batches, enrollments, certificates and student accounts. Sees the operational dashboards.',
  contentManager:
    'Adds, edits and deletes content only. No orders, no sales figures, no personal data, no settings.',
  manager:
    'Adds and edits content and training operations — but cannot delete anything, and cannot see orders, sales figures or personal details.',
};

export default function PermissionsMatrixPage() {
  const { showToast, toastNode } = useToast();

  const [catalog, setCatalog] = useState(null);
  const [managers, setManagers] = useState([]);
  const [draft, setDraft] = useState({});   // userId → Set of capability keys
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const me = useMemo(() => getStoredUser(), []);

  // No setState before the first await: React's set-state-in-effect rule (and the
  // cascading render it warns about) only bites on a synchronous update. `loading`
  // already starts true, so there is nothing to set on the way in.
  const load = useCallback(async () => {
    try {
      const [catRes, userRes] = await Promise.all([
        fetch(`${API}/user/permissions/catalog`, { headers: hdr() }),
        fetch(`${API}/user`, { headers: hdr() }),
      ]);

      if (catRes.status === 403 || userRes.status === 403) {
        setError('You do not have permission to manage staff permissions.');
        return;
      }

      const cat = await catRes.json();
      const users = await userRes.json();
      if (!cat.success || !users.success) {
        setError(cat.message || users.message || 'Could not load permissions.');
        return;
      }

      setError('');
      setCatalog(cat.data);
      const managerRoles = cat.data.managerRoles || [];
      const rows = (users.data || []).filter((u) => !u.isDeleted && managerRoles.includes(u.role));
      setManagers(rows);
      setDraft(
        Object.fromEntries(rows.map((u) => [u._id, new Set(u.capabilities || [])])),
      );
    } catch {
      setError('Network error while loading permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch-on-mount, the same shape every other admin page here uses. The rule
  // cannot see that all the state updates happen after an await, and satisfying
  // it properly would mean introducing a data-fetching library across ~90 pages.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const toggle = (userId, key) => {
    setDraft((prev) => {
      const next = new Set(prev[userId] || []);
      if (next.has(key)) next.delete(key); else next.add(key);
      return { ...prev, [userId]: next };
    });
  };

  const applyPreset = (userId, role) => {
    const defaults = catalog?.roleDefaults?.[role] || [];
    const grantable = catalog?.grantable || [];
    setDraft((prev) => ({
      ...prev,
      [userId]: new Set(defaults.filter((c) => grantable.includes(c))),
    }));
  };

  const isDirty = (u) => {
    const current = new Set(u.capabilities || []);
    const next = draft[u._id] || new Set();
    if (current.size !== next.size) return true;
    for (const c of next) if (!current.has(c)) return true;
    return false;
  };

  const save = async (u) => {
    setSaving(u._id);
    try {
      const res = await fetch(`${API}/user/${u._id}/permissions`, {
        method: 'PATCH',
        headers: jhdr(),
        body: JSON.stringify({ permissions: Array.from(draft[u._id] || []) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Trust the server's echo, not the local draft — it re-resolved the list.
        const saved = data.data?.capabilities || Array.from(draft[u._id] || []);
        setManagers((prev) =>
          prev.map((m) => (m._id === u._id ? { ...m, capabilities: saved, permissions: saved } : m)),
        );
        setDraft((prev) => ({ ...prev, [u._id]: new Set(saved) }));
        showToast('success', 'Permissions saved');
      } else {
        showToast('error', data.message || 'Could not save');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSaving(null);
    }
  };

  const grantable = catalog?.grantable || [];
  const columns = (catalog?.capabilities || []).filter((c) => grantable.includes(c.key));
  const groups = columns.reduce((acc, c) => {
    (acc[c.group] = acc[c.group] || []).push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <FiLoader className="animate-spin text-brand" size={30} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 min-h-screen bg-dash-soft">
        <div className="max-w-xl mx-auto mt-16 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <FiAlertCircle className="mx-auto text-rose-500 mb-2" size={26} />
          <p className="text-rose-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-dash-soft">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dash-ink outfit flex items-center gap-2">
          <FiShield className="text-brand" /> Manager Permissions
        </h1>
        <p className="text-dash-mute text-sm mt-1">
          ম্যানেজার কী কী করতে পারবে তা এখান থেকে চালু/বন্ধ করুন। Only a Super Admin or Admin can
          change these, and nobody can change their own.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 flex gap-3">
        <FiInfo className="text-sky-500 shrink-0 mt-0.5" size={16} />
        <div className="text-[13px] text-sky-900 space-y-1">
          <p>
            <b>Training Manager</b> — {ROLE_BLURB.trainingManager}
          </p>
          <p>
            <b>Content Manager</b> — {ROLE_BLURB.contentManager}
          </p>
          <p>
            <b>Manager</b> — {ROLE_BLURB.manager}
          </p>
          <p className="text-sky-700">
            These toggles are enforced by the API, not just by the menu: an unticked box means the
            matching request is refused with 403 even if the URL is typed by hand.
          </p>
        </div>
      </div>

      {managers.length === 0 ? (
        <div className="bg-dash-card rounded-xl border border-dash-line p-12 text-center">
          <div className="w-14 h-14 bg-dash-soft2 rounded-full flex items-center justify-center mx-auto mb-3">
            <FiUsers className="text-xl text-dash-faint" />
          </div>
          <p className="text-dash-ink4 font-semibold">No manager accounts yet</p>
          <p className="text-dash-mute2 text-sm mt-1">
            Create a Training Manager or Content Manager first — then set what they can do here.
          </p>
          <Link
            href="/dashboard/admin/user/staff"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold"
          >
            <FiUserPlus size={15} /> Go to Team / Staff
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {managers.map((u) => {
            const dirty = isDirty(u);
            const isSelf = String(u._id) === String(me?._id || me?.id || '');
            const set = draft[u._id] || new Set();
            return (
              <div key={u._id} className="bg-dash-card rounded-xl border border-dash-line shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-dash-line-soft bg-dash-soft/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(u.firstName?.[0] || 'M').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-dash-ink2 text-sm truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-[11px] text-dash-mute2 truncate">
                        {u.email} · <span className="font-semibold text-brand-ink">{ROLE_LABELS[u.role] || u.role}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => applyPreset(u._id, u.role)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dash-line text-dash-mute text-xs font-semibold hover:bg-dash-soft"
                      title="Reset to this role's default permissions"
                    >
                      <FiRotateCcw size={13} /> Role default
                    </button>
                    <button
                      onClick={() => save(u)}
                      disabled={!dirty || saving === u._id || isSelf}
                      title={isSelf ? 'You cannot change your own permissions' : undefined}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-strong disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving === u._id ? <FiLoader className="animate-spin" size={13} /> : <FiSave size={13} />}
                      {dirty ? 'Save changes' : 'Saved'}
                    </button>
                  </div>
                </div>

                <div className="p-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(groups).map(([groupName, caps]) => (
                    <div key={groupName}>
                      <p className="text-[10px] font-black text-dash-mute2 uppercase tracking-wider mb-2">
                        {groupName}
                      </p>
                      <div className="space-y-2">
                        {caps.map((c) => {
                          const on = set.has(c.key);
                          return (
                            <label
                              key={c.key}
                              title={c.description}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition
                                ${on ? 'border-brand-line bg-brand-soft/70' : 'border-dash-line-soft hover:bg-dash-soft'}`}
                            >
                              <span
                                className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border
                                  ${on ? 'bg-brand border-brand text-white' : 'border-dash-line-strong bg-dash-card'}`}
                              >
                                {on && <FiCheck size={11} strokeWidth={3} />}
                              </span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={on}
                                onChange={() => toggle(u._id, c.key)}
                              />
                              <span className="min-w-0">
                                <span className={`block text-[13px] font-semibold ${on ? 'text-brand-deep' : 'text-dash-ink4'}`}>
                                  {c.label}
                                </span>
                                <span className="block text-[11px] text-dash-mute2 leading-snug">
                                  {c.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toastNode}
    </div>
  );
}
