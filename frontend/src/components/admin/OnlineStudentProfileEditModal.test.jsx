import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OnlineStudentProfileEditModal from './OnlineStudentProfileEditModal';
import * as onlineStudentAdminService from '../../services/onlineStudentAdminService';

jest.mock('../../services/onlineStudentAdminService', () => ({
  getOnlineStudentProfile: jest.fn(),
  updateOnlineStudentProfile: jest.fn(),
}));

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('OnlineStudentProfileEditModal', () => {
  const student = { id: 5, name: 'Demo Student' };
  const baseProfile = {
    name: 'Demo Student',
    email: 'demo@student.com',
    phone: '03001234567',
    address: 'Street 1',
    date_of_birth: '2012-01-01',
    gender: 'Male',
    status: 'Active',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onlineStudentAdminService.getOnlineStudentProfile.mockResolvedValue(baseProfile);
    onlineStudentAdminService.updateOnlineStudentProfile.mockResolvedValue({
      id: 5,
      ...baseProfile,
    });
  });

  it('loads and renders profile data when opened', async () => {
    render(
      <OnlineStudentProfileEditModal
        open={true}
        onClose={jest.fn()}
        student={student}
        onProfileUpdated={jest.fn()}
      />
    );

    expect(screen.getByText('Loading profile...')).toBeInTheDocument();

    await waitFor(() => {
      expect(onlineStudentAdminService.getOnlineStudentProfile).toHaveBeenCalledWith(5);
    });

    expect(await screen.findByLabelText('Name')).toHaveValue('Demo Student');
    expect(screen.getByLabelText('Email')).toHaveValue('demo@student.com');
  });

  it('shows inline validation error and blocks save for empty name', async () => {
    render(
      <OnlineStudentProfileEditModal
        open={true}
        onClose={jest.fn()}
        student={student}
        onProfileUpdated={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Save Profile'));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onlineStudentAdminService.updateOnlineStudentProfile).not.toHaveBeenCalled();
  });

  it('submits updates and triggers callbacks on successful save', async () => {
    const onClose = jest.fn();
    const onProfileUpdated = jest.fn();

    render(
      <OnlineStudentProfileEditModal
        open={true}
        onClose={onClose}
        student={student}
        onProfileUpdated={onProfileUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Student' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'updated@student.com' } });

    fireEvent.click(screen.getByText('Save Profile'));

    await waitFor(() => {
      expect(onlineStudentAdminService.updateOnlineStudentProfile).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          name: 'Updated Student',
          email: 'updated@student.com',
        }),
        true
      );
    });

    expect(onProfileUpdated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
