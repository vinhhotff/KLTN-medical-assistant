import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  RefreshCw,
  ShieldCheck,
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
        // Fallback to REST if STOMP publish threw mid-reconnect
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
    const hasLocalAudio = Boolean(localStream && localStream.getAudioTracks().length > 0);
    const hasLocalVideo = Boolean(localStream && localStream.getVideoTracks().length > 0);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }
    // Ensure chat-only or audio-only participants can still receive remote audio/video
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
        // ignore stale ICE candidate
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

      // Ignore own signals
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
            // ignore malformed ICE candidate
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

  // Initialize local camera/mic with graceful audio-only and chat-only fallbacks
  const initLocalMedia = useCallback(async () => {
    stopLocalMedia();
    setMediaMode('initializing');
    setMediaNotice(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMediaMode('chat-only');
      setMicEnabled(false);
      setCamEnabled(false);
      setMediaNotice('Trình duyệt không hỗ trợ truy cập Camera/Micro trên kết nối hiện tại. Bạn vẫn có thể xem/nghe và nhắn tin.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      attachLocalPreview(stream);
      setMediaMode('video-audio');
      setMicEnabled(true);
      setCamEnabled(true);
      setMediaNotice(null);
    } catch {
      // Fallback 1: Audio-only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        if (!isMountedRef.current) {
          audioStream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = audioStream;
        attachLocalPreview(null);
        setMediaMode('audio-only');
        setMicEnabled(true);
        setCamEnabled(false);
        setMediaNotice('Không tìm thấy Camera hoặc chưa cấp quyền Camera — đang ở chế độ chỉ âm thanh.');
      } catch {
        // Fallback 2: Chat-only / receive-only
        localStreamRef.current = null;
        attachLocalPreview(null);
        setMediaMode('chat-only');
        setMicEnabled(false);
        setCamEnabled(false);
        setMediaNotice('Chưa cấp quyền Camera/Micro — đang ở chế độ chỉ xem & nhắn tin trực tuyến.');
      }
    }
  }, [attachLocalPreview, stopLocalMedia]);

  // Lifecycle: open room -> init media -> join API -> STOMP connect -> signal polling fallback
  useEffect(() => {
    if (!open || !appointmentId) return;
    isMountedRef.current = true;
    processedSignalIdsRef.current.clear();
    lastSignalTsRef.current = Date.now() - 5000;
    setCallSeconds(0);
    setPeerState('waiting');
    setRoomError(null);
    setLoadingRoom(true);
    setWsMessages([]);

    let disposed = false;

    const bootstrap = async () => {
      // Acquire media first so tracks are ready before offer/answer
      await initLocalMedia();
      if (disposed) return;

      try {
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
            // Sync current media state once WS is ready (joinRoom already broadcast JOIN)
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

        // If we are the initiator and partner is already in room, start WebRTC offer immediately
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

  // Attach local & remote video streams once the video elements finish mounting after loadingRoom=false
  useEffect(() => {
    if (loadingRoom) return;
    if (localStreamRef.current) attachLocalPreview(localStreamRef.current);
    if (remoteStreamRef.current) attachRemotePreview(remoteStreamRef.current);
  }, [loadingRoom, attachLocalPreview, attachRemotePreview]);

  // REST polling fallback for WebRTC signals when WS is not connected (and gentle 4s sync)
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
        // ignore polling error
      }
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [open, appointmentId, loadingRoom, roomError, wsConnected, handleIncomingSignal]);

  // Call duration timer while peer is connected
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
      // ignore clipboard error
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
        return { text: 'Đã kết nối Video/Audio P2P', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
      case 'connecting':
        return { text: 'Đang thiết lập kết nối P2P...', cls: 'bg-amber-500/20 text-amber-200 border-amber-400/30' };
      case 'disconnected':
        return { text: 'Kết nối bị gián đoạn — đang thử lại', cls: 'bg-rose-500/20 text-rose-200 border-rose-400/30' };
      default:
        return {
          text: remoteConnectedName ? `${remoteConnectedName} đã vào phòng` : `Đang chờ ${partnerRoleLabel.toLowerCase()}...`,
          cls: 'bg-slate-700/80 text-slate-200 border-slate-600',
        };
    }
  })();

  const roomShell = (
    <div
      className={`bg-slate-950 text-white flex flex-col overflow-hidden ${
        embedded ? 'h-screen w-full' : 'w-full h-full sm:h-[92vh] sm:max-w-7xl sm:rounded-3xl shadow-2xl border border-slate-800'
      }`}
    >
      {/* Top Clinical Bar */}
      <header className="px-4 sm:px-6 py-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-teal-300">{displayCode}</span>
              {displayRoomCode && (
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-mono font-bold text-indigo-200 hover:bg-indigo-500/30 cursor-pointer"
                  title="Sao chép mã phòng Video"
                >
                  <span>{displayRoomCode}</span>
                  {copiedRoomCode ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusPill.cls}`}>
                {statusPill.text}
              </span>
              {peerState === 'connected' && (
                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-700/50">
                  {formatDuration(callSeconds)}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 truncate mt-0.5">
              Phòng Khám Trực Tuyến MediAssist · {partnerRoleLabel}: <strong className="text-slate-200">{partnerName}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              wsConnected
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-200 border-amber-500/30'
            }`}
          >
            {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsConnected ? 'WS Realtime' : 'REST Sync'}
          </span>

          {canDoctorStart && (
            <button
              type="button"
              onClick={handleStartConsultation}
              disabled={startingExam}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {startingExam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Bắt đầu ca khám</span>
            </button>
          )}

          {isDoctorOrAdmin && onOpenEmr && (
            <button
              type="button"
              onClick={() => onOpenEmr(appointmentId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nhập Bệnh Án EMR</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMobileChat((v) => !v)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            <span>Chat</span>
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
        {/* Video Call Stage */}
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 gap-3 bg-slate-950">
          {roomError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs flex items-center justify-between gap-2">
              <span>{roomError}</span>
            </div>
          )}

          {mediaNotice && (
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2">
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

          {/* Video Tiles Area */}
          <div className="relative flex-1 min-h-[260px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
            {loadingRoom ? (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
                <span>Đang kết nối vào phòng khám trực tuyến...</span>
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

                {/* Remote Placeholder when video off or waiting */}
                {(!remoteHasVideo || !remoteCamOn) && (
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border-2 border-teal-400/40 flex items-center justify-center text-teal-200">
                      <User className="w-9 h-9" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{partnerName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {peerState === 'connected'
                          ? 'Đối tác đang tắt camera'
                          : remoteConnectedName
                          ? 'Đang thiết lập luồng Video/Audio...'
                          : `Đang chờ ${partnerRoleLabel.toLowerCase()} tham gia phòng...`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Remote Participant Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 backdrop-blur-xs border border-white/10 text-xs">
                  <span className="font-semibold text-white">{partnerName}</span>
                  {!remoteMicOn && <MicOff className="w-3.5 h-3.5 text-rose-400" aria-label="Đối tác đang tắt micro" />}
                </div>

                {/* Local Video PiP */}
                <div className="absolute bottom-3 right-3 w-32 sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-xl flex items-center justify-center">
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
                  <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/75 text-[10px] font-semibold text-slate-200 flex items-center gap-1">
                    <span>Bạn</span>
                    {!micEnabled && <MicOff className="w-2.5 h-2.5 text-rose-400" />}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Controls Dock */}
          <div className="flex flex-wrap items-center justify-center gap-3 py-2 px-4 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                micEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40'
              }`}
            >
              {micEnabled ? <Mic className="w-4 h-4 text-teal-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
              <span>{micEnabled ? 'Tắt Micro' : mediaMode === 'chat-only' ? 'Bật Micro' : 'Đang tắt Mic'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleCam}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                camEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40'
              }`}
            >
              {camEnabled ? <Video className="w-4 h-4 text-teal-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
              <span>{camEnabled ? 'Tắt Camera' : 'Bật Camera'}</span>
            </button>

            {isInitiator() && peerState !== 'connected' && remoteConnectedName && (
              <button
                type="button"
                onClick={() => void initiateOffer()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kết nối lại Video</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleEndCall}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Kết thúc cuộc gọi</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Cuộc gọi Video P2P được mã hóa trực tiếp giữa Bác sĩ và Bệnh nhân. Kết quả tư vấn chỉ mang tính hỗ trợ chuyên môn.</span>
          </div>
        </div>

        {/* Right Chat Sidebar */}
        <aside
          className={`${
            showMobileChat ? 'flex' : 'hidden lg:flex'
          } w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-100 text-slate-900 flex-col p-3 gap-2.5 h-[42vh] lg:h-auto shrink-0`}
        >
          {(initialAppointment?.chiefComplaint || initialAppointment?.consultationNotes) && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 shrink-0">
              <span className="font-bold text-slate-900 block mb-0.5">Lý do khám / Triệu chứng:</span>
              <p className="line-clamp-2">{initialAppointment.chiefComplaint || initialAppointment.consultationNotes}</p>
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
            className="flex-1 min-h-0"
          />
        </aside>
      </div>
    </div>
  );

  if (embedded) {
    return roomShell;
  }

  return (
    <div
      className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Phòng khám trực tuyến Telehealth"
    >
      {roomShell}
    </div>
  );
};
