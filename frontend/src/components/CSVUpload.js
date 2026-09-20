// src/components/CSVUpload.js
// Admin/Teacher page (/books-upload): import a book from a CSV (columns: Book, Topic, Class Activity,
// Home Activity, optional Chapter Title) or a JSON file (full content: lesson HTML, activity steps,
// challenges, images). "Preview" validates and shows what would change without saving; "Import"
// saves. See backend/books/importer.py for the rules.
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Browser copies of book data (book list, tables of contents) are stale after an import.
const clearBookCaches = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key === 'booksList' || key.startsWith('bookDetails_') || key.startsWith('bookToc_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // localStorage unavailable - nothing to clear
  }
};

const KINDS = ['chapters', 'lessons', 'activities'];

export default function CSVUpload() {
  const [file, setFile] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { dryRun, report } after a successful call
  const [errors, setErrors] = useState([]);

  const send = async (dryRun) => {
    if (!file) return;
    setBusy(true);
    setErrors([]);
    setResult(null);

    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('dry_run', dryRun ? 'true' : 'false');
    if (bookTitle.trim()) formData.append('book', bookTitle.trim());
    if (updateExisting) formData.append('update_existing', 'true');

    try {
      const response = await axios.post(`${API_URL}/api/books/upload/`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access')}` },
      });
      setResult({ dryRun, report: response.data.report });
      if (!dryRun) {
        clearBookCaches();
        setFile(null);
      }
    } catch (err) {
      const data = err.response && err.response.data;
      setErrors((data && data.errors) || [(data && (data.error || data.detail)) || 'Upload failed']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <h3>Upload Book (CSV or JSON)</h3>
      <p style={{ color: '#555' }}>
        <b>CSV</b> columns: <b>Book</b>, <b>Topic</b> (e.g. &quot;2.3 Loops&quot;), <b>Class Activity</b>,{' '}
        <b>Home Activity</b>, optional <b>Chapter Title</b>. <b>JSON</b> carries everything (lesson text,
        activity steps, challenges, images). Existing chapters, lessons and activities are never deleted.
      </p>

      <div style={{ margin: '12px 0' }}>
        <input type="file" accept=".csv,.json" onChange={(e) => setFile(e.target.files[0] || null)} />
      </div>
      <div style={{ margin: '12px 0' }}>
        <label>
          Book title (optional, overrides the Book column):{' '}
          <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="Book 3" />
        </label>
      </div>
      <div style={{ margin: '12px 0' }}>
        <label>
          <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />{' '}
          Also overwrite titles/content of rows that already exist (hand-added activity content and step images are kept)
        </label>
      </div>

      <button onClick={() => send(true)} disabled={!file || busy}>
        {busy ? 'Working...' : 'Preview (saves nothing)'}
      </button>{' '}
      <button onClick={() => send(false)} disabled={!file || busy}>
        Import
      </button>

      {errors.length > 0 && (
        <div style={{ marginTop: 16, color: '#b00020' }}>
          <b>Nothing was imported. Please fix:</b>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <b>{result.dryRun ? 'Preview - nothing saved yet' : 'Imported!'}</b>
          {Object.entries(result.report).map(([title, counts]) => (
            <div key={title} style={{ marginTop: 8 }}>
              <div><b>{title}</b></div>
              {KINDS.map((kind) => (
                <div key={kind}>
                  {kind}: {counts[kind].created} new, {counts[kind].updated} updated, {counts[kind].unchanged} unchanged
                  {counts[kind].kept > 0 && `, ${counts[kind].kept} kept (differ from the file)`}
                </div>
              ))}
              {counts.not_in_csv.length > 0 && (
                <div style={{ color: '#8a6d3b' }}>
                  In the database but not in this file (left untouched): {counts.not_in_csv.slice(0, 15).join(', ')}
                  {counts.not_in_csv.length > 15 && ` ... (+${counts.not_in_csv.length - 15} more)`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
