import { filterStudents, isStudentAbsent, runWithConcurrency } from './groupUpload';

const students = [
  { id: 1, name: 'Ayesha Khan' },
  { id: 2, name: 'Bilal Ahmed' },
  { id: 3, name: 'Hamza KHAN' },
];

describe('filterStudents', () => {
  it('returns everyone for an empty query', () => {
    expect(filterStudents(students, '  ')).toHaveLength(3);
  });

  it('matches case-insensitively on name', () => {
    expect(filterStudents(students, 'khan').map((s) => s.id)).toEqual([1, 3]);
  });
});

describe('isStudentAbsent', () => {
  it('is true only for Absent status', () => {
    const data = { 1: { status: 'Absent' }, 2: { status: 'Present' } };
    expect(isStudentAbsent(data, 1)).toBe(true);
    expect(isStudentAbsent(data, 2)).toBe(false);
    expect(isStudentAbsent(data, 3)).toBe(false);
  });
});

describe('runWithConcurrency', () => {
  it('reports per-item success and failure without rejecting', async () => {
    const results = await runWithConcurrency([1, 2, 3], async (n) => {
      if (n === 2) throw new Error('boom');
      return n * 10;
    });
    expect(results.map((r) => r.ok)).toEqual([true, false, true]);
    expect(results[0].value).toBe(10);
    expect(results[1].error.message).toBe('boom');
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await runWithConcurrency([1, 2, 3, 4, 5, 6], async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    }, 3);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
