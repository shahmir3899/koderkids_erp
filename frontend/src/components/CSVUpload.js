// src/components/CSVUpload.js
import React, { useState } from 'react';
import axios from 'axios';

export default function CSVUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('csv_file', file);

    axios.post('http://127.0.0.1:8000/api/books/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(() => {
      alert('Uploaded! Refresh to see new data.');
      setFile(null);
    })
    .catch(() => alert('Upload failed'))
    .finally(() => setUploading(false));
  };

  return React.createElement('div', null, [
    React.createElement('h3', { key: 'header' }, 'Upload New Book CSV'),
    React.createElement('input', {
      key: 'input',
      type: 'file',
      accept: '.csv',
      onChange: e => setFile(e.target.files[0])
    }),
    React.createElement('button', {
      key: 'button',
      onClick: handleUpload,
      disabled: !file || uploading
    }, uploading ? 'Uploading...' : 'Upload')
  ]);
}