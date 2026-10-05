/**
 * Investigation Store for TRUSTLENS
 * Provides in-memory repository for storing and retrieving investigations by ID.
 * Supports deep-linking from Chrome Extension to Web Application.
 */

import { InvestigationResult } from "../types";

// In-memory LRU-style map (persists within server runtime)
const INVESTIGATION_MAP = new Map<string, InvestigationResult>();
const MAX_STORED_INVESTIGATIONS = 200;

/**
 * Saves an investigation result to the store.
 */
export function saveInvestigation(result: InvestigationResult): void {
  if (!result || !result.id) return;

  // Evict oldest if capacity exceeded
  if (INVESTIGATION_MAP.size >= MAX_STORED_INVESTIGATIONS) {
    const oldestKey = INVESTIGATION_MAP.keys().next().value;
    if (oldestKey) INVESTIGATION_MAP.delete(oldestKey);
  }

  INVESTIGATION_MAP.set(result.id, result);
}

/**
 * Retrieves an investigation result by unique ID.
 */
export function getInvestigation(id: string): InvestigationResult | null {
  if (!id) return null;
  return INVESTIGATION_MAP.get(id) || null;
}

/**
 * Lists the most recent investigations.
 */
export function listRecentInvestigations(limit = 10): InvestigationResult[] {
  const all = Array.from(INVESTIGATION_MAP.values());
  return all.reverse().slice(0, limit);
}
