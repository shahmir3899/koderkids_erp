// ============================================
// BULK REPORT SERVICE
// Generates bulk student report ZIPs in small batches so that no single request
// outlives the gateway timeout, then merges the batch ZIPs into one download.
// ============================================

import axios from 'axios';
import JSZip from 'jszip';
import { getAuthHeaders, API_URL } from '../api';
import { shortSchoolName } from '../utils/schoolShortName';

export const BATCH_SIZE = 8;
const REQUEST_TIMEOUT_MS = 90000;
const MAX_ATTEMPTS = 3; // 1 try + 2 retries (only for transient failures)
const RETRY_DELAY_MS = 2000;

const blobToText = (blob) =>
  typeof blob.text === 'function'
    ? blob.text()
    : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(blob);
      });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Turn any axios failure into { code, title, detail, retryable, requestId, failed }.
 * With responseType 'blob' the JSON error body arrives as a Blob, so read it first.
 */
export async function classifyBulkError(error) {
  if (axios.isCancel?.(error) || error?.code === 'ERR_CANCELED') {
    return { code: 'cancelled', title: 'Cancelled', detail: 'Generation was cancelled.', retryable: false };
  }

  const response = error?.response;
  let body = null;
  if (response?.data instanceof Blob) {
    try {
      body = JSON.parse(await blobToText(response.data));
    } catch {
      body = null;
    }
  } else if (response?.data && typeof response.data === 'object') {
    body = response.data;
  }
  const requestId = body?.request_id || response?.headers?.['x-request-id'];
  const serverMsg = body?.error || body?.detail;

  if (!response) {
    if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
      return {
        code: 'client_timeout',
        title: 'Request timed out in the browser',
        detail: `No answer within ${REQUEST_TIMEOUT_MS / 1000}s. The server may be overloaded.`,
        retryable: true,
      };
    }
    return {
      code: 'network',
      title: 'Could not reach the server',
      detail: 'Check your internet connection, or the server may be restarting.',
      retryable: true,
    };
  }

  const status = response.status;
  if (status === 502 || status === 503 || status === 504) {
    return {
      code: `gateway_${status}`,
      title: `Server gateway error (${status})`,
      detail:
        status === 502
          ? 'The gateway gave up waiting for the backend (it timed out or the backend restarted).'
          : 'The server is temporarily unavailable.',
      retryable: true,
      requestId,
    };
  }
  if (status === 401 || status === 403) {
    return {
      code: 'auth',
      title: status === 401 ? 'Session expired' : 'Not allowed',
      detail: status === 401 ? 'Please log in again and retry.' : 'You do not have permission to generate these reports.',
      retryable: false,
      requestId,
    };
  }
  if (status === 422) {
    return {
      code: body?.code || 'no_reports_generated',
      title: 'No reports could be generated',
      detail: serverMsg || 'Every student in this batch failed.',
      retryable: false,
      requestId,
      failed: body?.failed || [],
    };
  }
  if (status >= 400 && status < 500) {
    return {
      code: body?.code || `http_${status}`,
      title: `Request rejected (${status})`,
      detail: serverMsg || 'The server rejected the request parameters.',
      retryable: false,
      requestId,
    };
  }
  return {
    code: body?.code || `http_${status}`,
    title: `Server error (${status})`,
    detail: serverMsg || 'The server hit an unexpected error while building the reports.',
    retryable: status >= 500 && body?.code !== 'server_error', // server_error is deterministic enough; don't hammer it
    requestId,
  };
}

const parseFailedHeader = (headers) => {
  try {
    const raw = headers?.['x-report-failed-students'];
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const safe = (s) => String(s || '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');

/**
 * Run the whole bulk job.
 *
 * @param {object} p
 * @param {Array}  p.studentIds
 * @param {object} p.params        - everything except student_ids/selectedImages/includeBackground
 * @param {object} p.selectedImages / p.includeBackground - keyed by student id
 * @param {string} p.zipName       - final merged ZIP file name
 * @param {function} p.onProgress  - called with a snapshot after every state change
 * @param {AbortSignal} p.signal
 * @returns {Promise<{blob, filename, generated, failed, cancelled}>}
 */
export async function runBulkReportJob({
  studentIds,
  params,
  selectedImages,
  includeBackground,
  zipName,
  onProgress,
  signal,
}) {
  const batches = chunk(studentIds, BATCH_SIZE).map((ids, i) => ({
    index: i,
    ids,
    status: 'queued', // queued | working | retrying | done | failed
    attempt: 0,
    error: null,
    generated: 0,
  }));

  const merged = new JSZip();
  const failedStudents = []; // { student_id, name, stage, reason }
  let generatedCount = 0;
  const startedAt = Date.now();

  const emit = (extra = {}) =>
    onProgress?.({
      batches: batches.map((b) => ({ ...b })),
      totalStudents: studentIds.length,
      generated: generatedCount,
      failedCount: failedStudents.length,
      elapsedMs: Date.now() - startedAt,
      ...extra,
    });

  emit({ phase: 'running' });

  for (const batch of batches) {
    if (signal?.aborted) break;

    const pick = (obj) =>
      Object.fromEntries(batch.ids.filter((id) => obj && obj[id] !== undefined).map((id) => [id, obj[id]]));

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (signal?.aborted) break;
      batch.attempt = attempt;
      batch.status = attempt === 1 ? 'working' : 'retrying';
      emit({ phase: 'running', currentBatch: batch.index });

      try {
        const response = await axios.post(
          `${API_URL}/reports/api/generate-bulk-pdf-zip/`,
          {
            ...params,
            student_ids: batch.ids,
            selectedImages: pick(selectedImages),
            includeBackground: pick(includeBackground),
          },
          { headers: getAuthHeaders(), responseType: 'blob', timeout: REQUEST_TIMEOUT_MS, signal }
        );

        const zip = await JSZip.loadAsync(response.data);
        const failedHere = parseFailedHeader(response.headers);
        const names = [];
        zip.forEach((path, entry) => {
          if (!entry.dir && path !== 'FAILED.txt') names.push(path);
        });
        for (const name of names) {
          merged.file(name, await zip.file(name).async('uint8array'));
        }

        batch.generated = names.length;
        generatedCount += names.length;
        failedStudents.push(...failedHere);
        batch.status = 'done';
        batch.error = null;
        lastError = null;
        break;
      } catch (err) {
        lastError = await classifyBulkError(err);
        if (lastError.code === 'cancelled') break;
        batch.error = lastError;
        if (!lastError.retryable || attempt === MAX_ATTEMPTS) break;
        emit({ phase: 'running', currentBatch: batch.index });
        await sleep(RETRY_DELAY_MS);
      }
    }

    if (signal?.aborted) break;

    if (lastError) {
      batch.status = 'failed';
      const serverFailed = lastError.failed?.length ? lastError.failed : null;
      if (serverFailed) {
        failedStudents.push(...serverFailed);
      } else {
        batch.ids.forEach((id) =>
          failedStudents.push({
            student_id: id,
            name: null,
            stage: 'request',
            reason: `${lastError.title}${lastError.requestId ? ` [req ${lastError.requestId.slice(0, 8)}]` : ''}`,
          })
        );
      }
    }
    emit({ phase: 'running', currentBatch: batch.index });
  }

  const cancelled = !!signal?.aborted;

  if (failedStudents.length) {
    const lines = [
      `${generatedCount} of ${studentIds.length} reports generated.`,
      '',
      ...failedStudents.map(
        (f) => `- ${f.name || `Student #${f.student_id}`} (id ${f.student_id}) failed at '${f.stage}': ${f.reason}`
      ),
    ];
    merged.file('FAILED.txt', lines.join('\n'));
  }

  const blob = generatedCount > 0 ? await merged.generateAsync({ type: 'blob', compression: 'DEFLATE' }) : null;
  const result = {
    blob,
    filename: zipName,
    generated: generatedCount,
    failed: failedStudents,
    cancelled,
    batches,
  };
  emit({ phase: cancelled ? 'cancelled' : 'finished' });
  return result;
}

export const buildZipName = ({ schoolName, className, period }) =>
  `${safe(shortSchoolName(schoolName)) || 'School'}_${safe(className) || 'Class'}_Reports_${safe(period)}_${pakistanDateStamp()}.zip`;

// YYYYMMDD in Pakistan time (Asia/Karachi), regardless of the browser's timezone
const pakistanDateStamp = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
    .replace(/-/g, '');
