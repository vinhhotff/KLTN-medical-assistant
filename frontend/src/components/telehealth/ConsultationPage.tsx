import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { TelehealthRoomModal } from './TelehealthRoomModal';

export const ConsultationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const fallbackPath = user?.role === 'DOCTOR' ? '/doctor' : user?.role === 'ADMIN' ? '/admin' : '/patient';

  if (!id) {
    navigate(fallbackPath, { replace: true });
    return null;
  }

  return (
    <TelehealthRoomModal
      open={true}
      appointmentId={id}
      currentUserId={user?.id}
      currentUserRole={user?.role}
      embedded={true}
      onClose={() => navigate(fallbackPath)}
    />
  );
};
