import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchLocations } from '@/lib/api';

describe('searchLocations API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when query is blank or whitespace', async () => {
    const res = await searchLocations('   ');
    expect(res).toEqual([]);
  });

  it('fetches candidates and caches result for subsequent queries', async () => {
    const mockCandidates = [
      {
        name: 'Mursān',
        latitude: 27.57788,
        longitude: 77.94091,
        country: 'India',
        admin1: 'Uttar Pradesh',
        admin2: 'Hathras',
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: mockCandidates }),
    } as Response);

    const firstResult = await searchLocations('Mursan');
    expect(firstResult).toEqual(mockCandidates);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call for the same query should hit in-memory cache instantly
    const cachedResult = await searchLocations('mursan');
    expect(cachedResult).toEqual(mockCandidates);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // No new network call
  });

  it('handles empty results cleanly without throwing error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [] }),
    } as Response);

    const res = await searchLocations('MursnaNonExistent');
    expect(res).toEqual([]);
  });

  it('supports AbortSignal cancellation', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(searchLocations('New Delhi', controller.signal)).rejects.toThrow();
  });
});
