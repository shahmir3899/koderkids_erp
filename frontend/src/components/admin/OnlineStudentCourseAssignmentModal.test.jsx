import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OnlineStudentCourseAssignmentModal from './OnlineStudentCourseAssignmentModal';
import * as onlineStudentAdminService from '../../services/onlineStudentAdminService';

jest.mock('../../services/onlineStudentAdminService', () => ({
  getAvailableCourses: jest.fn(),
  assignCoursesToStudent: jest.fn(),
  removeCourseFromStudent: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('OnlineStudentCourseAssignmentModal', () => {
  const student = {
    id: 9,
    name: 'Online Test Student',
    enrollments: [
      { id: 1, course_id: 1, course_title: 'Math Basics', status: 'active' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onlineStudentAdminService.getAvailableCourses.mockResolvedValue({
      courses: [
        { id: 1, title: 'Math Basics' },
        { id: 2, title: 'Python Basics' },
        { id: 3, title: 'Physics Intro' },
      ],
    });
  });

  it('select filtered toggles non-enrolled filtered courses only', async () => {
    render(
      <OnlineStudentCourseAssignmentModal
        open={true}
        onClose={jest.fn()}
        student={student}
        onAssignmentComplete={jest.fn()}
      />
    );

    await waitFor(() => expect(onlineStudentAdminService.getAvailableCourses).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), {
      target: { value: 'Py' },
    });

    fireEvent.click(screen.getByText('Select Filtered'));

    // After selecting filtered (non-enrolled, matching "Py" → Python Basics only)
    // the selection counter should reflect exactly 1 item
    expect(await screen.findByText('1 book/course item(s) selected')).toBeInTheDocument();
  });

  it('shows assignment summary after successful assign and triggers refresh callback', async () => {
    const onAssignmentComplete = jest.fn();
    const onClose = jest.fn();

    onlineStudentAdminService.assignCoursesToStudent.mockResolvedValue({
      assigned: [{ id: 10, course_id: 2, course_title: 'Python Basics' }],
      skipped: [{ course_id: 1, course_title: 'Math Basics', reason: 'Already enrolled' }],
      failed: [],
      summary: {
        assigned_count: 1,
        skipped_count: 1,
        failed_count: 0,
      },
    });

    render(
      <OnlineStudentCourseAssignmentModal
        open={true}
        onClose={onClose}
        student={student}
        onAssignmentComplete={onAssignmentComplete}
      />
    );

    await waitFor(() => expect(onlineStudentAdminService.getAvailableCourses).toHaveBeenCalled());

    // Wait for course cards to be fully rendered in the DOM
    await screen.findByText('Python Basics');

    fireEvent.click(screen.getByText('Select Filtered'));

    // Wait for the selection counter to confirm state has updated
    await waitFor(() =>
      expect(screen.getByText('2 book/course item(s) selected')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText('Assign Books/Courses'));

    await waitFor(() => {
      expect(onlineStudentAdminService.assignCoursesToStudent).toHaveBeenCalledWith(
        9,
        expect.arrayContaining([2, 3]),
        true
      );
    });

    expect(await screen.findByText(/Result:/i)).toBeInTheDocument();
    expect(screen.getByText(/Assigned 1, Skipped 1, Failed 0/i)).toBeInTheDocument();
    expect(onAssignmentComplete).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
