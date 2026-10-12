// ============================================
// GROUP UPLOAD HELPERS - pure logic for GroupImageUploadModal
// ============================================
// Location: src/utils/groupUpload.js

export const GROUP_UPLOAD_CONCURRENCY = 3;

export const isStudentAbsent = (attendanceData, studentId) =>
  attendanceData?.[studentId]?.status === 'Absent';

/** Case-insensitive name search; an empty query returns everyone. */
export const filterStudents = (students, query) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return students;
  return students.filter((s) => (s.name || '').toLowerCase().includes(q));
};

/**
 * Run `worker(item)` over `items` with at most `limit` in flight.
 * Never rejects: resolves with [{ item, ok, value | error }] in input order.
 */
export const runWithConcurrency = async (items, worker, limit = GROUP_UPLOAD_CONCURRENCY) => {
  const results = new Array(items.length);
  let next = 0;

  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { item: items[index], ok: true, value: await worker(items[index]) };
      } catch (error) {
        results[index] = { item: items[index], ok: false, error };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
};
