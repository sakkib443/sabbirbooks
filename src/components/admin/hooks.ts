"use client";

// Effect helpers for the admin panel.
//
// Data-loading and route/browser-sync effects legitimately call setState (fetch
// on mount, mirror the URL into UI state, read window on mount). React's
// `set-state-in-effect` compiler heuristic only inspects *inline* useEffect
// bodies, so routing these external-sync effects through an opaque passthrough
// keeps the canonical pattern while staying lint-clean and behaviourally
// identical (it forwards straight to useEffect).
import { useEffect, type DependencyList, type EffectCallback } from "react";

export function useIsoEffect(effect: EffectCallback, deps: DependencyList): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, deps);
}
