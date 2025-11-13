// src/pages/BookSelectPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook } from '@fortawesome/free-solid-svg-icons';
import BookTreeSelect from '../components/BookTreeSelect';
import Modal from 'react-modal';
import './BookSelectPage.css';

Modal.setAppElement('#root');

export default function BookSelectPage() {
  const [books, setBooks] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeBook, setActiveBook] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);

  // ————————————————————————
  // GET TOKEN (only once per render)
  // ————————————————————————
  const getToken = () => {
    const token = localStorage.getItem('access');
    if (!token) {
      console.error('No token found under key "access"');
      return null;
    }
    console.log('Token (first 10):', token.substring(0, 10) + '...');
    return token;
  };

  // ————————————————————————
  // 1. FETCH BOOK LIST
  // ————————————————————————
  useEffect(() => {
    const fetchBooks = async () => {
      setPageLoading(true);
      setPageError(null);

      const token = getToken();
      if (!token) {
        setPageError('Please log in.');
        setPageLoading(false);
        return;
      }

      try {
        const url = `${process.env.REACT_APP_API_URL}/api/books/books/`;
        const resp = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (resp.status === 401) {
          setPageError('Session expired.');
          return;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        setBooks(data);
      } catch (err) {
        console.error(err);
        setPageError('Failed to load books.');
      } finally {
        setPageLoading(false);
      }
    };

    fetchBooks();
  }, []); // ← Runs once

  // ————————————————————————
  // 2. OPEN BOOK → FETCH FULL TREE
  // ————————————————————————
  const openBook = useCallback(async (bookId, bookTitle) => {
    setModalOpen(true);
    setActiveBook({ id: bookId, title: bookTitle, topics: [] });
    setSelectedTopicIds([]);
    setModalLoading(true);
    setModalError(null);

    const token = getToken();
    if (!token) {
      setModalError('Authentication required.');
      setModalLoading(false);
      return;
    }

    try {
      const url = `${process.env.REACT_APP_API_URL}/api/books/books/${bookId}/`;
      console.log('Fetching book details:', url); // DEBUG

      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,   // ← CRITICAL
          'Content-Type': 'application/json',
        },
      });

      // ——— 401 Handling ———
      if (resp.status === 401) {
        setModalError('Unauthorized. Redirecting to login...');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        console.error('API error:', resp.status, text);
        throw new Error(`HTTP ${resp.status}`);
      }

      const fullBook = await resp.json();
      setActiveBook(fullBook);
    } catch (err) {
      console.error('openBook error:', err);
      setModalError('Failed to load book topics.');
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setActiveBook(null);
    setModalError(null);
  };

  const handleTreeSelect = (ids) => {
    setSelectedTopicIds(ids);
    console.log('Selected IDs:', ids);
  };

  // ————————————————————————
  // UI
  // ————————————————————————
  if (pageLoading) return <p className="center">Loading books…</p>;
  if (pageError) return <p className="center error">{pageError}</p>;

  return (
    <div className="book-select-page">
      <h2 className="page-title">Choose a Book</h2>

      <div className="books-grid">
        {books.map((b) => (
          <button
            key={b.id}
            className="book-btn"
            onClick={() => openBook(b.id, b.title)}
            aria-label={`Open ${b.title}`}
          >
            <FontAwesomeIcon icon={faBook} className="book-icon" />
            <span className="book-label">{b.title}</span>
          </button>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onRequestClose={closeModal}
        className="book-modal"
        overlayClassName="book-modal-overlay"
        aria={{ labelledby: 'modal-title' }}
      >
        {activeBook && (
          <>
            <h3 id="modal-title" className="modal-title">{activeBook.title}</h3>

            {modalLoading ? (
              <p className="center">Loading topics…</p>
            ) : modalError ? (
              <p className="center error">{modalError}</p>
            ) : (
              <BookTreeSelect
                books={[activeBook]}
                selectedIds={selectedTopicIds}
                onSelect={handleTreeSelect}
              />
            )}

            <button className="modal-close-btn" onClick={closeModal}>
              Close
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}