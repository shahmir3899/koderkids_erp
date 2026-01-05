import React, { useState } from "react";
import { ClipLoader } from "react-spinners";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook } from "@fortawesome/free-solid-svg-icons";
import { useBooks } from "../../hooks/useBooks";
import { toast } from "react-toastify";

const BookGridSelector = ({ selectedBookId, onBookSelect, error }) => {
  // Use cached books from context
  const { booksList, loading, fetchBookDetails } = useBooks();
  const [loadingBookId, setLoadingBookId] = useState(null);

  const handleBookSelect = async (book) => {
    setLoadingBookId(book.id);

    try {
      // This will use cache if available, otherwise fetch
      const fullBookData = await fetchBookDetails(book.id);

      onBookSelect(fullBookData);
      toast.success(`Book "${fullBookData.title}" selected`);
    } catch (err) {
      console.error('Failed to load book details:', err);
      toast.error('Failed to load book details');
    } finally {
      setLoadingBookId(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <ClipLoader size={40} color="#3b82f6" />
        <p style={styles.loadingText}>Loading books...</p>
      </div>
    );
  }

  if (booksList.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No books available</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {booksList.map((book) => (
          <button
            key={book.id}
            style={{
              ...styles.bookCard,
              ...(selectedBookId === book.id ? styles.bookCardSelected : {}),
            }}
            onClick={() => handleBookSelect(book)}
            disabled={loadingBookId === book.id}
          >
            {loadingBookId === book.id ? (
              <ClipLoader size={24} color="#3b82f6" />
            ) : (
              <FontAwesomeIcon icon={faBook} style={styles.bookIcon} />
            )}
            <span style={styles.bookTitle}>{book.title}</span>
          </button>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
  },

  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },

  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },

  retryButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    maxHeight: '500px',
    overflowY: 'auto',
  },

  bookCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '20px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '140px',
  },

  bookCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },

  bookIcon: {
    fontSize: '32px',
    color: '#3b82f6',
  },

  bookTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    wordWrap: 'break-word',
  },

  error: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#dc2626',
  },
};

export default BookGridSelector;
