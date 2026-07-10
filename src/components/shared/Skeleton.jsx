'use client';

export const Skeleton = ({ className = '', ...props }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} {...props} />
);

export const SkeletonText = ({ w = 'w-24', h = 'h-4' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${w} ${h}`} />
);

export const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
        <div className="w-14 h-7 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
    </div>
  </div>
);

export const SkeletonRow = () => (
  <tr className="border-b border-slate-100">
    <td className="px-5 py-3.5"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse" /><div className="space-y-1.5"><div className="w-24 h-3.5 bg-slate-200 rounded animate-pulse" /><div className="w-32 h-3 bg-slate-100 rounded animate-pulse" /></div></div></td>
    <td className="px-5 py-3.5"><div className="w-28 h-3.5 bg-slate-200 rounded animate-pulse" /></td>
    <td className="px-5 py-3.5"><div className="w-20 h-3.5 bg-slate-200 rounded animate-pulse" /></td>
    <td className="px-5 py-3.5 text-center"><div className="w-16 h-2 bg-slate-200 rounded-full animate-pulse mx-auto" /></td>
    <td className="px-5 py-3.5 text-center"><div className="w-16 h-6 bg-slate-200 rounded-md animate-pulse mx-auto" /></td>
    <td className="px-5 py-3.5"><div className="w-24 h-6 bg-slate-200 rounded-md animate-pulse" /></td>
  </tr>
);

export const SkeletonChart = () => (
  <div className="flex items-end gap-4 h-48">
    {[40, 65, 80, 55, 90, 70].map((h, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-2">
        <div className="w-6 h-3 bg-slate-200 rounded animate-pulse" />
        <div className="w-full rounded-lg bg-slate-200 animate-pulse" style={{ height: `${h}%` }} />
        <div className="w-8 h-3 bg-slate-100 rounded animate-pulse" />
      </div>
    ))}
  </div>
);
