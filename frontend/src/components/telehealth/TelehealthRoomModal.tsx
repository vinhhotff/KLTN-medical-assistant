import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  FileCheck,
  FileText,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { ConsultationChatPanel } from './ConsultationChatPanel';
import { createTelehealthStompClient } from './stompHelper';
import type { Client } from '@stomp/stompjs';
import type {
  ConsultationMessageDto,
  ConsultationRoomDto,
  SignalMessageDto,
  TelehealthAppointmentRef,
} from './telehealthTypes';

interface TelehealthRoomModalProps {
  open: boolean;
  appointmentId: string;
  initialAppointment?: TelehealthAppointmentRef | null;
  currentUserId?: string;
  currentUserRole?: 'PATIENT' | 'DOCTOR' | 'ADMIN' | string;
  onClose: () => void;
  /** Called when appointment status transitions (e.g. CHECKED_IN or IN_PROGRESS). */
  onStatusUpdated?: (appointmentId: string, newStatus: string) => void;
  /** Optional doctor shortcut to open clinical EMR modal alongside/after call. */
  onOpenEmr?: (appointmentId: string) => void;
  /** Render full-page instead of fixed modal overlay (used by /consultation/:id route). */
  embedded?: boolean;
}

type MediaMode = 'initializing' | 'video-audio' | 'audio-only' | 'chat-only';
type PeerConnectionState = 'idle' | 'waiting' | 'connecting' | 'connected' | 'disconnected';

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const COMMON_ICD10_LIST = [
  { code: 'J00', name: 'Viêm mũi họng cấp (Cảm thường)' },
  { code: 'J06.9', name: 'Nhiễm khuẩn hô hấp trên cấp tính' },
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
  { code: 'E11', name: 'Đái tháo đường typ 2' },
  { code: 'K29.7', name: 'Viêm dạ dày, không xác định' },
  { code: 'R07.2', name: 'Đau trước tim / Đau ngực không điển hình' },
  { code: 'G43.9', name: 'Đau nửa đầu (Migraine)' },
  { code: 'L20', name: 'Viêm da cơ địa dị ứng' },
];

export const TelehealthRoomModal: React.FC<TelehealthRoomModalProps> = ({
  open,
  appointmentId,
  initialAppointment,
  currentUserId,
  currentUserRole,
  onClose,
  onStatusUpdated,
  onOpenEmr,
  embedded = false,
}) => {
  const [room, setRoom] = useState<ConsultationRoomDto | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Picture-in-Picture floating mode
  const [isMinimized, setIsMinimized] = useState(false);

  // Media state
  const [mediaMode, setMediaMode] = useState<MediaMode>('initializing');
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);

  // Remote peer & WebRTC state
  const [peerState, setPeerState] = useState<PeerConnectionState>('waiting');
  const [remoteConnectedName, setRemoteConnectedName] = useState<string | null>(null);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [remoteMicOn, setRemoteMicOn] = useState(true);
  const [remoteCamOn, setRemoteCamOn] = useState(true);

  // WS & Chat bridge
  const [wsConnected, setWsConnected] = useState(false);
  const [wsMessages, setWsMessages] = useState<ConsultationMessageDto[]>([]);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [startingExam, setStartingExam] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // Doctor Clinical Workstation Tab State
  const [activeTab, setActiveTab] = useState<'chat' | 'emr'>('chat');
  const [emrChiefComplaint, setEmrChiefComplaint] = useState(
    initialAppointment?.chiefComplaint || initialAppointment?.consultationNotes || ''
  );
  const [emrIcd10Code, setEmrIcd10Code] = useState(initialAppointment?.icd10Code || '');
  const [emrIcd10Name, setEmrIcd10Name] = useState(initialAppointment?.icd10Name || '');
  const [emrTreatmentPlan, setEmrTreatmentPlan] = useState(initialAppointment?.treatmentPlan || '');
  const [emrFollowUpDate, setEmrFollowUpDate] = useState(
    initialAppointment?.followUpDate ? initialAppointment.followUpDate.slice(0, 10) : ''
  );
  const [savingEmrDraft, setSavingEmrDraft] = useState(false);
  const [submittingEmr, setSubmittingEmr] = useState(false);
  const [emrSuccessNotice, setEmrSuccessNotice] = useState<string | null>(null);
  const [emrError, setEmrError] = useState<string | null>(null);

  // Refs for WebRTC lifecycle
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const stompRef = useRef<Client | null>(null);
  const roomRef = useRef<ConsultationRoomDto | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const lastSignalTsRef = useRef<number>(Date.now() - 5000);
  const isMountedRef = useRef(false);
  const micEnabledRef = useRef(micEnabled);
  const camEnabledRef = useRef(camEnabled);

  roomRef.current = room;
  micEnabledRef.current = micEnabled;
  camEnabledRef.current = camEnabled;

  const isDoctorOrAdmin = currentUserRole === 'DOCTOR' || currentUserRole === 'ADMIN';

  // Load existing EMR draft from localStorage for doctor
  useEffect(() => {
    if (!isDoctorOrAdmin || !appointmentId) return;
    try {
      const draftKey = `emr_draft_${appointmentId}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chiefComplaint !== undefined) setEmrChiefComplaint(parsed.chiefComplaint);
        if (parsed.icd10Code !== undefined) setEmrIcd10Code(parsed.icd10Code);
        if (parsed.icd10Name !== undefined) setEmrIcd10Name(parsed.icd10Name);
        if (parsed.treatmentPlan !== undefined) setEmrTreatmentPlan(parsed.treatmentPlan);
        if (parsed.followUpDate !== undefined) setEmrFollowUpDate(parsed.followUpDate);
      }
    } catch {
      // ignore draft parse error
    }
  }, [isDoctorOrAdmin, appointmentId]);

  const isInitiator = useCallback(() => {
    const r = roomRef.current;
    if (r && currentUserId) {
      return currentUserId === r.doctorId;
    }
    return isDoctorOrAdmin;
  }, [currentUserId, isDoctorOrAdmin]);

  const attachLocalPreview = useCallback((stream: MediaStream | null) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, []);

  const attachRemotePreview = useCallback((stream: MediaStream | null) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    attachLocalPreview(null);
  }, [attachLocalPreview]);

  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    attachRemotePreview(null);
    setRemoteHasVideo(false);
  }, [attachRemotePreview]);

  const sendSignal = useCallback(
    async (payload: {
      type: SignalMessageDto['type'];
      sdp?: string;
      candidate?: string;
      payload?: string;
      audioEnabled?: boolean;
      videoEnabled?: boolean;
    }) => {
      try {
        const client = stompRef.current;
        if (client && client.connected) {
          client.publish({
            destination: `/app/consultation/${appointmentId}/signal`,
            body: JSON.stringify(payload),
          });
          return;
        }
        await api.post(`/consultations/${appointmentId}/signal`, payload);
      } catch {
        try {
          await api.post(`/consultations/${appointmentId}/signal`, payload);
        } catch {
          // ignore transient signal send failure
        }
      }
    },
    [appointmentId]
  );

  const createPeerConnection = useCallback(() => {
    closePeerConnection();
    const iceServers =
      roomRef.current?.iceServers && roomRef.current.iceServers.length > 0
        ? (roomRef.current.iceServers as RTCIceServer[])
        : DEFAULT_ICE_SERVERS;

    const pc = new RTCPeerConnection({ iceServers });

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    attachRemotePreview(remoteStream);

    const localStream = localStreamRef.current;
    let hasLocalAudio = false;
    let hasLocalVideo = false;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
        if (track.kind === 'audio') hasLocalAudio = true;
        if (track.kind === 'video') hasLocalVideo = true;
      });
    }

    if (!hasLocalAudio) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    if (!hasLocalVideo) {
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal({
          type: 'ICE_CANDIDATE',
          candidate: JSON.stringify(event.candidate.toJSON()),
        });
      }
    };

    pc.ontrack = (event) => {
      const target = remoteStreamRef.current;
      if (!target) return;
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!target.getTracks().some((t) => t.id === track.id)) {
            target.addTrack(track);
          }
        });
      } else {
        target.addTrack(event.track);
      }
      if (event.track.kind === 'video') {
        setRemoteHasVideo(true);
        event.track.onended = () => setRemoteHasVideo(false);
      }
      attachRemotePreview(target);
    };

    pc.onconnectionstatechange = () => {
      if (!isMountedRef.current) return;
      const st = pc.connectionState;
      if (st === 'connected') {
        setPeerState('connected');
      } else if (st === 'connecting') {
        setPeerState('connecting');
      } else if (st === 'disconnected' || st === 'failed') {
        setPeerState('disconnected');
      } else if (st === 'closed') {
        setPeerState('waiting');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!isMountedRef.current) return;
      const st = pc.iceConnectionState;
      if (st === 'connected' || st === 'completed') {
        setPeerState('connected');
      } else if (st === 'checking') {
        setPeerState('connecting');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [attachRemotePreview, closePeerConnection, sendSignal]);

  const flushIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const queued = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {
        // ignore stale candidate
      }
    }
  }, []);

  const initiateOffer = useCallback(async () => {
    try {
      setPeerState('connecting');
      const pc = createPeerConnection();
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      if (offer.sdp) {
        await sendSignal({
          type: 'OFFER',
          sdp: offer.sdp,
          audioEnabled: micEnabledRef.current,
          videoEnabled: camEnabledRef.current,
        });
      }
    } catch {
      setPeerState('disconnected');
    }
  }, [createPeerConnection, sendSignal]);

  const handleIncomingSignal = useCallback(
    async (signal: SignalMessageDto) => {
      if (!signal || !signal.id) return;
      if (processedSignalIdsRef.current.has(signal.id)) return;
      processedSignalIdsRef.current.add(signal.id);

      if (signal.timestamp && signal.timestamp > lastSignalTsRef.current) {
        lastSignalTsRef.current = signal.timestamp;
      }

      if (currentUserId && signal.senderId === currentUserId) return;

      switch (signal.type) {
        case 'JOIN': {
          setRemoteConnectedName(signal.senderName || 'Đối tác');
          if (typeof signal.audioEnabled === 'boolean') setRemoteMicOn(signal.audioEnabled);
          if (typeof signal.videoEnabled === 'boolean') setRemoteCamOn(signal.videoEnabled);
          if (isInitiator()) {
            const st = pcRef.current?.connectionState;
            if (!pcRef.current || st === 'closed' || st === 'failed' || st === 'disconnected') {
              await initiateOffer();
            }
          } else {
            setPeerState((prev) => (prev === 'connected' ? prev : 'connecting'));
          }
          break;
        }
        case 'OFFER': {
          if (!signal.sdp) break;
          setRemoteConnectedName(signal.senderName || 'Đối tác');
          if (typeof signal.audioEnabled === 'boolean') setRemoteMicOn(signal.audioEnabled);
          if (typeof signal.videoEnabled === 'boolean') setRemoteCamOn(signal.videoEnabled);
          setPeerState('connecting');
          const pc = createPeerConnection();
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
          await flushIceCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (answer.sdp) {
            await sendSignal({
              type: 'ANSWER',
              sdp: answer.sdp,
              audioEnabled: micEnabledRef.current,
              videoEnabled: camEnabledRef.current,
            });
          }
          break;
        }
        case 'ANSWER': {
          if (!signal.sdp || !pcRef.current) break;
          if (typeof signal.audioEnabled === 'boolean') setRemoteMicOn(signal.audioEnabled);
          if (typeof signal.videoEnabled === 'boolean') setRemoteCamOn(signal.videoEnabled);
          if (pcRef.current.signalingState === 'have-local-offer') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
            await flushIceCandidates(pcRef.current);
          }
          break;
        }
        case 'ICE_CANDIDATE': {
          if (!signal.candidate) break;
          try {
            const parsed = JSON.parse(signal.candidate) as RTCIceCandidateInit;
            if (pcRef.current && pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(parsed));
            } else {
              pendingCandidatesRef.current.push(parsed);
            }
          } catch {
            // ignore
          }
          break;
        }
        case 'MEDIA_STATE': {
          if (typeof signal.audioEnabled === 'boolean') setRemoteMicOn(signal.audioEnabled);
          if (typeof signal.videoEnabled === 'boolean') setRemoteCamOn(signal.videoEnabled);
          break;
        }
        case 'LEAVE':
        case 'CALL_END': {
          closePeerConnection();
          setRemoteConnectedName(null);
          setPeerState('waiting');
          break;
        }
        case 'ROOM_STATUS': {
          const nextStatus =
            typeof signal.payload === 'string'
              ? signal.payload
              : signal.payload && typeof signal.payload === 'object'
              ? signal.payload.status
              : undefined;
          if (nextStatus) {
            setRoom((prev) => (prev ? { ...prev, status: nextStatus } : prev));
            onStatusUpdated?.(appointmentId, nextStatus);
          }
          break;
        }
      }
    },
    [
      appointmentId,
      closePeerConnection,
      createPeerConnection,
      currentUserId,
      flushIceCandidates,
      initiateOffer,
      isInitiator,
      onStatusUpdated,
      sendSignal,
    ]
  );

  const initLocalMedia = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaMode('chat-only');
      setMediaNotice('Trình duyệt không hỗ trợ WebRTC Media. Phòng khám hoạt động ở chế độ Chat.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      attachLocalPreview(stream);
      setMediaMode('video-audio');
      setMicEnabled(true);
      setCamEnabled(true);
      setMediaNotice(null);
      return;
    } catch {
      // Try audio-only fallback
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        localStreamRef.current = audioStream;
        attachLocalPreview(audioStream);
        setMediaMode('audio-only');
        setMicEnabled(true);
        setCamEnabled(false);
        setMediaNotice('Không thể mở Camera (đang bị ứng dụng khác chiếm hoặc từ chối quyền). Chuyển sang chế độ chỉ gọi thoại.');
        return;
      } catch {
        setMediaMode('chat-only');
        setMicEnabled(false);
        setCamEnabled(false);
        setMediaNotice('Chưa cấp quyền Micro và Camera. Bạn vẫn có thể trao đổi lâm sàng qua tin nhắn văn bản và hình ảnh.');
      }
    }
  }, [attachLocalPreview]);

  // Main lifecycle: Bootstrap room, initialize media, connect WebSocket STOMP
  useEffect(() => {
    if (!open || !appointmentId) return;

    let disposed = false;
    isMountedRef.current = true;
    setLoadingRoom(true);
    setRoomError(null);
    setPeerState('waiting');
    setCallSeconds(0);
    processedSignalIdsRef.current.clear();
    lastSignalTsRef.current = Date.now() - 5000;

    const bootstrap = async () => {
      try {
        await initLocalMedia();
        if (disposed) return;

        const joinRes = await api.post(`/consultations/${appointmentId}/join`);
        const roomData = joinRes.data?.data as ConsultationRoomDto | undefined;
        if (disposed || !roomData) return;

        setRoom(roomData);
        roomRef.current = roomData;
        onStatusUpdated?.(appointmentId, roomData.status);
        setLoadingRoom(false);

        const other = roomData.activeParticipants?.find((p) => p.userId !== currentUserId);
        if (other) {
          setRemoteConnectedName(other.fullName);
        }

        // Connect STOMP WebSocket
        const stomp = createTelehealthStompClient({
          wsEndpoint: roomData.wsEndpoint || '/api/v1/ws',
          onConnect: () => {
            if (disposed) return;
            setWsConnected(true);
            stomp.subscribe(`/topic/consultation.${appointmentId}.messages`, (frame) => {
              try {
                const msg = JSON.parse(frame.body) as ConsultationMessageDto;
                setWsMessages((prev) => [...prev.slice(-30), msg]);
              } catch {
                // ignore
              }
            });
            stomp.subscribe(`/topic/consultation.${appointmentId}.signals`, (frame) => {
              try {
                const sig = JSON.parse(frame.body) as SignalMessageDto;
                void handleIncomingSignal(sig);
              } catch {
                // ignore
              }
            });
            void sendSignal({
              type: 'MEDIA_STATE',
              audioEnabled: Boolean(localStreamRef.current?.getAudioTracks().some((t) => t.enabled)),
              videoEnabled: Boolean(localStreamRef.current?.getVideoTracks().some((t) => t.enabled)),
            });
          },
          onDisconnect: () => {
            if (!disposed) setWsConnected(false);
          },
          onError: () => {
            if (!disposed) setWsConnected(false);
          },
        });
        stompRef.current = stomp;
        stomp.activate();

        if (other && (currentUserId ? currentUserId === roomData.doctorId : isDoctorOrAdmin)) {
          await initiateOffer();
        }
      } catch (err) {
        if (!disposed) {
          setRoomError(getApiErrorMessage(err, 'Không thể kết nối vào phòng khám trực tuyến.'));
          setLoadingRoom(false);
        }
      }
    };

    void bootstrap();

    return () => {
      disposed = true;
      isMountedRef.current = false;
      setWsConnected(false);
      void api.post(`/consultations/${appointmentId}/leave`).catch(() => {});
      if (stompRef.current) {
        void stompRef.current.deactivate();
        stompRef.current = null;
      }
      closePeerConnection();
      stopLocalMedia();
    };
  }, [open, appointmentId]);

  // Re-attach video stream preview on mount or when toggling minimized mode
  useEffect(() => {
    if (loadingRoom) return;
    if (localStreamRef.current) attachLocalPreview(localStreamRef.current);
    if (remoteStreamRef.current) attachRemotePreview(remoteStreamRef.current);
  }, [loadingRoom, isMinimized, attachLocalPreview, attachRemotePreview]);

  // REST polling fallback for WebRTC signals
  useEffect(() => {
    if (!open || !appointmentId || loadingRoom || roomError) return;
    const pollMs = wsConnected ? 5000 : 1500;
    const timer = window.setInterval(async () => {
      try {
        const res = await api.get(`/consultations/${appointmentId}/signals`, {
          params: { since: lastSignalTsRef.current, includeSelf: false },
        });
        const signals = Array.isArray(res.data?.data) ? (res.data.data as SignalMessageDto[]) : [];
        for (const sig of signals) {
          await handleIncomingSignal(sig);
        }
      } catch {
        // ignore
      }
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [open, appointmentId, loadingRoom, roomError, wsConnected, handleIncomingSignal]);

  // Call duration timer
  useEffect(() => {
    if (!open || peerState !== 'connected') return;
    const timer = window.setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, peerState]);

  const handleToggleMic = async () => {
    const stream = localStreamRef.current;
    const audioTracks = stream?.getAudioTracks() || [];
    if (audioTracks.length === 0) {
      await initLocalMedia();
      return;
    }
    const next = !micEnabled;
    audioTracks.forEach((t) => {
      t.enabled = next;
    });
    setMicEnabled(next);
    void sendSignal({ type: 'MEDIA_STATE', audioEnabled: next, videoEnabled: camEnabled });
  };

  const handleToggleCam = async () => {
    const stream = localStreamRef.current;
    const videoTracks = stream?.getVideoTracks() || [];
    if (videoTracks.length === 0) {
      await initLocalMedia();
      return;
    }
    const next = !camEnabled;
    videoTracks.forEach((t) => {
      t.enabled = next;
    });
    setCamEnabled(next);
    void sendSignal({ type: 'MEDIA_STATE', audioEnabled: micEnabled, videoEnabled: next });
  };

  const handleStartConsultation = async () => {
    if (startingExam) return;
    try {
      setStartingExam(true);
      const res = await api.post(`/consultations/${appointmentId}/start`);
      const updated = res.data?.data;
      const newStatus = updated?.status || 'IN_PROGRESS';
      setRoom((prev) => (prev ? { ...prev, status: newStatus } : prev));
      onStatusUpdated?.(appointmentId, newStatus);
    } catch (err) {
      setRoomError(getApiErrorMessage(err, 'Không thể chuyển trạng thái ca khám.'));
    } finally {
      setStartingExam(false);
    }
  };

  const handleEndCall = async () => {
    await sendSignal({ type: 'CALL_END' });
    await api.post(`/consultations/${appointmentId}/leave`).catch(() => {});
    closePeerConnection();
    stopLocalMedia();
    onClose();
  };

  const handleCopyRoomCode = async () => {
    const code = room?.meetingRoomCode || initialAppointment?.meetingRoomCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    } catch {
      // ignore
    }
  };

  // Doctor Clinical Actions: Save draft & Complete Clinical
  const handleSaveEmrDraft = () => {
    setSavingEmrDraft(true);
    try {
      const draftKey = `emr_draft_${appointmentId}`;
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          chiefComplaint: emrChiefComplaint,
          icd10Code: emrIcd10Code,
          icd10Name: emrIcd10Name,
          treatmentPlan: emrTreatmentPlan,
          followUpDate: emrFollowUpDate,
          updatedAt: new Date().toISOString(),
        })
      );
      setEmrSuccessNotice('Đã lưu nháp hồ sơ bệnh án thành công.');
      setTimeout(() => setEmrSuccessNotice(null), 3000);
    } catch {
      setEmrError('Không thể lưu bản nháp vào bộ nhớ trình duyệt.');
    } finally {
      setSavingEmrDraft(false);
    }
  };

  const handleSubmitEmr = async () => {
    if (!emrChiefComplaint.trim()) {
      setEmrError('Vui lòng nhập lý do khám hoặc diễn biến lâm sàng.');
      return;
    }
    setSubmittingEmr(true);
    setEmrError(null);
    try {
      await api.post(`/appointments/${appointmentId}/complete-clinical`, {
        chiefComplaint: emrChiefComplaint.trim(),
        vitalSignsJson: null,
        icd10Code: emrIcd10Code.trim() || null,
        icd10Name: emrIcd10Name.trim() || null,
        prescriptionJson: null,
        treatmentPlan: emrTreatmentPlan.trim() || null,
        consultationNotes: emrChiefComplaint.trim() || null,
        followUpDate: emrFollowUpDate || null,
        clinicRoom: 'Tư vấn trực tuyến (Telehealth)',
      });
      try {
        localStorage.removeItem(`emr_draft_${appointmentId}`);
      } catch {
        // ignore
      }
      setEmrSuccessNotice('Đã ký duyệt & hoàn tất ca khám lâm sàng thành công!');
      onStatusUpdated?.(appointmentId, 'COMPLETED');
      if (roomRef.current) {
        setRoom((prev) => (prev ? { ...prev, status: 'COMPLETED' } : prev));
      }
      setTimeout(() => setEmrSuccessNotice(null), 4000);
    } catch (err) {
      setEmrError(getApiErrorMessage(err, 'Không thể ký hoàn tất bệnh án.'));
    } finally {
      setSubmittingEmr(false);
    }
  };

  if (!open) return null;

  const displayCode = room?.appointmentCode || initialAppointment?.appointmentCode || 'TELEHEALTH';
  const displayRoomCode = room?.meetingRoomCode || initialAppointment?.meetingRoomCode;
  const partnerName = isDoctorOrAdmin
    ? room?.patientName || initialAppointment?.patientName || 'Bệnh nhân'
    : room?.doctorName
    ? `BS. ${room.doctorName}`
    : initialAppointment?.doctorName
    ? `BS. ${initialAppointment.doctorName}`
    : 'Bác sĩ';
  const partnerRoleLabel = isDoctorOrAdmin ? 'Bệnh nhân' : 'Bác sĩ phụ trách';
  const appointmentStatus = room?.status || initialAppointment?.status || 'SCHEDULED';
  const canDoctorStart = isDoctorOrAdmin && (appointmentStatus === 'SCHEDULED' || appointmentStatus === 'CHECKED_IN');

  const statusPill = (() => {
    switch (peerState) {
      case 'connected':
        return {
          text: 'P2P Đã kết nối',
          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'connecting':
        return {
          text: 'Đang kết nối P2P...',
          cls: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'disconnected':
        return {
          text: 'Kết nối gián đoạn',
          cls: 'bg-rose-500/15 text-rose-200 border-rose-500/30',
          dot: 'bg-rose-400',
        };
      default:
        return {
          text: remoteConnectedName ? `${remoteConnectedName} đã vào phòng` : `Đang chờ ${partnerRoleLabel.toLowerCase()}...`,
          cls: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-400',
        };
    }
  })();

  // -------------------------------------------------------------
  // 1. PICTURE-IN-PICTURE MINIMIZED FLOATING WIDGET
  // -------------------------------------------------------------
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-5 right-5 z-[80] w-80 sm:w-96 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out"
        role="region"
        aria-label="Cửa sổ cuộc gọi nổi"
      >
        {/* Floating Mini Header */}
        <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full ${statusPill.dot} shrink-0`} />
            <span className="text-xs font-bold text-white truncate max-w-[120px]">{partnerName}</span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              #{displayCode}
            </span>
            {peerState === 'connected' && (
              <span className="font-mono tabular-nums text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                {formatDuration(callSeconds)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleEndCall}
              className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Mini Video */}
        <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${remoteHasVideo && remoteCamOn ? 'block' : 'hidden'}`}
          />
          {(!remoteHasVideo || !remoteCamOn) && (
            <div className="flex flex-col items-center justify-center text-center p-3 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 mb-1">
                <User className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-slate-200">{partnerName}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{statusPill.text}</span>
            </div>
          )}

          {/* Local Mini Preview PiP */}
          <div className="absolute bottom-2 right-2 w-20 aspect-video rounded-lg overflow-hidden bg-slate-800 border border-slate-600 shadow-md">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] ${
                mediaMode === 'video-audio' && camEnabled ? 'block' : 'hidden'
              }`}
            />
            {(mediaMode !== 'video-audio' || !camEnabled) && (
              <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400 bg-slate-900">
                Cam tắt
              </div>
            )}
          </div>
        </div>

        {/* Floating Quick Action Dock */}
        <div className="px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                micEnabled
                  ? 'bg-slate-800 text-teal-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-rose-600 text-white shadow-xs'
              }`}
              title={micEnabled ? 'Tắt Micro' : 'Bật Micro'}
            >
              {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleToggleCam}
              className={`p-2 rounded-xl text-xs transition cursor-pointer ${
                camEnabled
                  ? 'bg-slate-800 text-teal-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-rose-600 text-white shadow-xs'
              }`}
              title={camEnabled ? 'Tắt Camera' : 'Bật Camera'}
            >
              {camEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Mở bàn khám</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. FULL CLINICAL ROOM STAGE
  // -------------------------------------------------------------
  const roomShell = (
    <div
      className={`bg-slate-950 text-white flex flex-col overflow-hidden ${
        embedded ? 'h-screen w-full' : 'w-full h-full sm:h-[94vh] sm:max-w-7xl sm:rounded-3xl shadow-2xl border border-slate-800'
      }`}
    >
      {/* Top Clinical Bar */}
      <header className="px-4 sm:px-6 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        {/* Left identity & call stats */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-400/25 text-teal-300 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                <span>{partnerName}</span>
                <span className="text-[11px] font-semibold text-teal-400 font-sans px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">
                  {partnerRoleLabel}
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                  #{displayCode}
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusPill.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusPill.dot}`} />
                <span>{statusPill.text}</span>
              </span>

              {peerState === 'connected' && (
                <span className="font-mono tabular-nums text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-700/50">
                  {formatDuration(callSeconds)}
                </span>
              )}

              {displayRoomCode && (
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-400/25 text-[11px] font-mono font-medium text-indigo-200 hover:bg-indigo-500/25 transition cursor-pointer"
                  title="Sao chép mã phòng Video"
                >
                  <span>Phòng: {displayRoomCode}</span>
                  {copiedRoomCode ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              wsConnected
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-200 border-amber-500/30'
            }`}
          >
            {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{wsConnected ? 'WebSocket Realtime' : 'REST Polling'}</span>
          </span>

          {canDoctorStart && (
            <button
              type="button"
              onClick={handleStartConsultation}
              disabled={startingExam}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {startingExam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Bắt đầu ca khám</span>
            </button>
          )}

          {/* Minimize to PiP Floating Window */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Thu nhỏ thành cửa sổ nổi để tra cứu dữ liệu ngoài dashboard"
          >
            <Minimize2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Cửa sổ nổi</span>
          </button>

          {isDoctorOrAdmin && onOpenEmr && (
            <button
              type="button"
              onClick={() => {
                setIsMinimized(true);
                onOpenEmr(appointmentId);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              title="Mở toàn bộ trạm lâm sàng đa màn hình EMR"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bàn khám đầy đủ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMobileChat((v) => !v)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            <span>Chat & EMR</span>
          </button>

          <button
            type="button"
            onClick={handleEndCall}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Thoát phòng khám trực tuyến"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Split Stage */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left Video Stage */}
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 gap-3 bg-slate-950 relative">
          {roomError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{roomError}</span>
              </div>
            </div>
          )}

          {mediaNotice && (
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span>{mediaNotice}</span>
              <button
                type="button"
                onClick={() => void initLocalMedia()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Thử cấp quyền lại
              </button>
            </div>
          )}

          {/* Video Viewport Area */}
          <div className="relative flex-1 min-h-[280px] rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
            {loadingRoom ? (
              <div className="flex flex-col items-center gap-3 text-slate-400 text-xs">
                <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                <span className="font-medium text-slate-300">Đang thiết lập phòng khám an toàn MediAssist...</span>
              </div>
            ) : (
              <>
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${remoteHasVideo && remoteCamOn ? 'block' : 'hidden'}`}
                />

                {/* Remote Placeholder */}
                {(!remoteHasVideo || !remoteCamOn) && (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border-2 border-teal-400/30 flex items-center justify-center text-teal-300 shadow-xl">
                      <User className="w-12 h-12" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{partnerName}</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {peerState === 'connected'
                          ? 'Đối tác đang tắt camera'
                          : remoteConnectedName
                          ? 'Đang thiết lập luồng Video & Âm thanh...'
                          : `Đang chờ ${partnerRoleLabel.toLowerCase()} tham gia phòng khám...`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Remote Participant Name Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 text-xs shadow-md">
                  <span className="font-semibold text-white">{partnerName}</span>
                  {!remoteMicOn && <MicOff className="w-3.5 h-3.5 text-rose-400" aria-label="Đối tác đang tắt micro" />}
                </div>

                {/* Local Video PiP */}
                <div className="absolute bottom-4 right-4 w-32 sm:w-48 aspect-video rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700/80 shadow-2xl flex items-center justify-center z-10 transition-transform duration-200 hover:scale-105">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${
                      mediaMode === 'video-audio' && camEnabled ? 'block' : 'hidden'
                    }`}
                  />
                  {(mediaMode !== 'video-audio' || !camEnabled) && (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-[11px] gap-1 p-2 text-center">
                      <VideoOff className="w-4 h-4 text-slate-500" />
                      <span>{mediaMode === 'chat-only' ? 'Chỉ Chat' : 'Camera tắt'}</span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-semibold text-slate-200 flex items-center gap-1.5 border border-white/10">
                    <span>Bạn</span>
                    {!micEnabled && <MicOff className="w-2.5 h-2.5 text-rose-400" />}
                  </div>
                </div>

                {/* Floating Modern Glass Controls Dock */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-2xl">
                  {/* Mic Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                      micEnabled
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                    }`}
                    title={micEnabled ? 'Tắt Micro' : 'Bật Micro'}
                    aria-label={micEnabled ? 'Tắt Micro' : 'Bật Micro'}
                  >
                    {micEnabled ? <Mic className="w-5 h-5 text-teal-400" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  {/* Cam Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleCam}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer ${
                      camEnabled
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                    }`}
                    title={camEnabled ? 'Tắt Camera' : 'Bật Camera'}
                    aria-label={camEnabled ? 'Tắt Camera' : 'Bật Camera'}
                  >
                    {camEnabled ? <Video className="w-5 h-5 text-teal-400" /> : <VideoOff className="w-5 h-5" />}
                  </button>

                  {/* Reconnect Video (if initiator and interrupted) */}
                  {isInitiator() && peerState !== 'connected' && remoteConnectedName && (
                    <button
                      type="button"
                      onClick={() => void initiateOffer()}
                      className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition cursor-pointer shadow-md"
                      title="Kết nối lại luồng Video"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}

                  {/* Minimize PiP shortcut */}
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition cursor-pointer"
                    title="Cửa sổ nổi (Picture-in-Picture)"
                  >
                    <Minimize2 className="w-4 h-4 text-teal-400" />
                  </button>

                  {/* End Call Button */}
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="px-5 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-rose-950/50 cursor-pointer"
                    title="Kết thúc cuộc gọi"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Kết thúc</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Legal Clinical Disclaimer */}
          <div className="hidden sm:flex items-center justify-center gap-1.5 text-[11px] text-slate-400 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>
              Mã hóa trực tiếp WebRTC P2P (DTLS-SRTP). Tư vấn từ xa hỗ trợ chuyên môn theo hồ sơ AI Triage đã xác thực.
            </span>
          </div>
        </div>

        {/* Right Split Sidebar: Dual Tab for Doctor (Chat & EMR Workstation) / Single Chat for Patient */}
        <aside
          className={`${
            showMobileChat ? 'flex' : 'hidden lg:flex'
          } w-full lg:w-[420px] border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/95 text-slate-100 flex-col h-[52vh] lg:h-auto shrink-0`}
        >
          {/* Top Segmented Tab Switcher (For Doctor) */}
          {isDoctorOrAdmin ? (
            <div className="p-3 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-teal-600 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Trao đổi lâm sàng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('emr')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    activeTab === 'emr'
                      ? 'bg-teal-600 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Bệnh án EMR & AI</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-slate-100">Trao đổi lâm sàng & Gửi ảnh / Xét nghiệm</span>
              </div>
            </div>
          )}

          {/* TAB 1: LIVE CHAT & FILE ATTACHMENTS */}
          {activeTab === 'chat' && (
            <div className="flex-1 min-h-0 flex flex-col p-3">
              {(initialAppointment?.chiefComplaint || initialAppointment?.consultationNotes) && (
                <div className="mb-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 shrink-0">
                  <div className="flex items-center gap-1.5 text-teal-400 font-bold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lý do khám ban đầu:</span>
                  </div>
                  <p className="line-clamp-2 text-slate-300 leading-relaxed">
                    {initialAppointment.chiefComplaint || initialAppointment.consultationNotes}
                  </p>
                </div>
              )}

              <ConsultationChatPanel
                appointmentId={appointmentId}
                currentUserId={currentUserId}
                partnerName={partnerName}
                incomingMessages={wsMessages}
                parentManagesWs={true}
                parentWsConnected={wsConnected}
                disabled={appointmentStatus === 'CANCELLED' || appointmentStatus === 'NO_SHOW'}
                theme="dark"
                showHeader={false}
                className="flex-1 min-h-0 border-0 shadow-none bg-transparent"
              />
            </div>
          )}

          {/* TAB 2: DOCTOR CLINICAL ENCOUNTER WORKSTATION */}
          {isDoctorOrAdmin && activeTab === 'emr' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs">
              {/* AI SBAR Summary / Triage insight */}
              {(initialAppointment?.triageSbarSummary || initialAppointment?.triageUrgencyLevel) && (
                <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-teal-100 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-teal-300 text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Trợ lý AI Triage (NegEx Parsed)</span>
                    </span>
                    {initialAppointment.triageUrgencyLevel && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        {initialAppointment.triageUrgencyLevel}
                      </span>
                    )}
                  </div>
                  {initialAppointment.triageSbarSummary && (
                    <p className="text-[11px] text-teal-200/90 leading-relaxed">
                      {initialAppointment.triageSbarSummary}
                    </p>
                  )}
                </div>
              )}

              {emrSuccessNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{emrSuccessNotice}</span>
                </div>
              )}

              {emrError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{emrError}</span>
                </div>
              )}

              {/* Chief Complaint / Examination Findings */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Lý do khám & Diễn biến lâm sàng <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={emrChiefComplaint}
                  onChange={(e) => setEmrChiefComplaint(e.target.value)}
                  placeholder="Ghi nhận triệu chứng, tiền sử và diễn biến trong cuộc gọi..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-400 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* ICD-10 Code & Diagnostic Name */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Chẩn đoán sơ bộ ICD-10
                </label>
                {/* Quick Diagnosis Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_ICD10_LIST.map((icd) => (
                    <button
                      key={icd.code}
                      type="button"
                      onClick={() => {
                        setEmrIcd10Code(icd.code);
                        setEmrIcd10Name(icd.name);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                        emrIcd10Code === icd.code
                          ? 'bg-teal-600 text-white border-teal-500'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {icd.code} - {icd.name.split('(')[0].trim()}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={emrIcd10Code}
                    onChange={(e) => setEmrIcd10Code(e.target.value.toUpperCase())}
                    placeholder="Mã: J00"
                    className="bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 font-mono text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="text"
                    value={emrIcd10Name}
                    onChange={(e) => setEmrIcd10Name(e.target.value)}
                    placeholder="Tên bệnh: Viêm mũi họng cấp..."
                    className="col-span-2 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Treatment Plan & Advice */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Kế hoạch điều trị & Lời dặn
                </label>
                <textarea
                  rows={3}
                  value={emrTreatmentPlan}
                  onChange={(e) => setEmrTreatmentPlan(e.target.value)}
                  placeholder="Kê toa thuốc, chế độ nghỉ ngơi, theo dõi nhiệt độ, triệu chứng cần tái khám ngay..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 text-slate-100 placeholder-slate-400 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Follow-up Date */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Hẹn ngày tái khám (nếu có)
                </label>
                <input
                  type="date"
                  value={emrFollowUpDate}
                  onChange={(e) => setEmrFollowUpDate(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Clinical Submission Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEmrDraft}
                    disabled={savingEmrDraft}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-teal-400" />
                    <span>{savingEmrDraft ? 'Đang lưu...' : 'Lưu bản nháp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitEmr}
                    disabled={submittingEmr}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {submittingEmr ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Ký & Hoàn tất ca khám</span>
                  </button>
                </div>

                {onOpenEmr && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMinimized(true);
                      onOpenEmr(appointmentId);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-teal-300 font-medium text-[11px] border border-slate-700/60 flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Mở Bàn Khám EMR Toàn Diện (Thu nhỏ Video)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  if (embedded) {
    return roomShell;
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Phòng khám trực tuyến Telehealth"
    >
      {roomShell}
    </div>
  );
};
