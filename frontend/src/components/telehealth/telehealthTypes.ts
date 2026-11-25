export type ConsultationType = 'IN_PERSON' | 'ONLINE';

export type ConsultationMessageType = 'TEXT' | 'IMAGE' | 'PRESCRIPTION_NOTE';

export interface ConsultationMessageDto {
  id: string;
  appointmentId: string;
  senderId: string;
  senderRole: 'PATIENT' | 'DOCTOR' | 'ADMIN' | string;
  senderName: string;
  messageType: ConsultationMessageType;
  content?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
}

export type SignalType =
  | 'JOIN'
  | 'LEAVE'
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'MEDIA_STATE'
  | 'CALL_END'
  | 'ROOM_STATUS';

export interface SignalMessageDto {
  id: string;
  appointmentId: string;
  type: SignalType;
  senderId: string;
  senderRole: string;
  senderName: string;
  sdp?: string | null;
  candidate?: string | null;
  payload?: string | { status?: string } | null;
  audioEnabled?: boolean | null;
  videoEnabled?: boolean | null;
  timestamp: number;
}

export interface RoomParticipant {
  userId: string;
  fullName: string;
  role: string;
  joinedAt: string;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ConsultationRoomDto {
  appointmentId: string;
  appointmentCode: string;
  consultationType: ConsultationType;
  status: string;
  meetingRoomCode?: string | null;
  meetingUrl?: string | null;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  checkedInAt?: string | null;
  canJoinCall: boolean;
  wsEndpoint?: string;
  sockJsEndpoint?: string;
  iceServers?: IceServerConfig[];
  activeParticipants: RoomParticipant[];
}

export interface TelehealthAppointmentRef {
  id: string;
  appointmentCode: string;
  patientId?: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  scheduledStart: string;
  status: string;
  consultationType?: ConsultationType;
  meetingRoomCode?: string | null;
  meetingUrl?: string | null;
  chiefComplaint?: string | null;
  consultationNotes?: string | null;
}
