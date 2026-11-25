import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  ImagePlus,
  Loader2,
  Send,
  ShieldCheck,
  Wifi,
  WifiOff,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { createTelehealthStompClient } from './stompHelper';
import type { ConsultationMessageDto } from './telehealthTypes';

interface ConsultationChatPanelProps {
  appointmentId: string;
  currentUserId?: string;
  partnerName?: string;
  /** Optional external messages pushed by parent (e.g. TelehealthRoomModal's shared STOMP socket). */
  incomingMessages?: ConsultationMessageDto[];
  /** True when parent owns a live STOMP connection (disables duplicate standalone STOMP socket). */
  parentManagesWs?: boolean;
  parentWsConnected?: boolean;
  disabled?: boolean;
  className?: string;
  /** Clinical visual theme: 'light' for standalone dialogs, 'dark' for video room sidebar */
  theme?: 'light' | 'dark';
  /** Show the top inner title bar (usually hidden inside video room where parent header already exists) */
  showHeader?: boolean;
}

const isPdfUrl = (url?: string | null, content?: string | null) => {
  const target = (url || '').toLowerCase();
  const label = (content || '').toLowerCase();
  return target.includes('.pdf') || label.endsWith('.pdf');
};

export const ConsultationChatPanel: React.FC<ConsultationChatPanelProps> = ({
  appointmentId,
  currentUserId,
  partnerName,
  incomingMessages,
  parentManagesWs = false,
  parentWsConnected = false,
  disabled = false,
  className = '',
  theme = 'light',
  showHeader = true,
}) => {
  const [messages, setMessages] = useState<ConsultationMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localWsConnected, setLocalWsConnected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const lastCreatedAtRef = useRef<string | null>(null);

  const mergeMessages = useCallback((incoming: ConsultationMessageDto[]) => {
    if (!incoming || incoming.length === 0) return;
    setMessages((prev) => {
      const map = new Map<string, ConsultationMessageDto>();
      for (const m of prev) map.set(m.id, m);
      for (const m of incoming) map.set(m.id, m);
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      if (merged.length > 0) {
        lastCreatedAtRef.current = merged[merged.length - 1].createdAt;
      }
      return merged;
    });
  }, []);

  // Merge external WS messages pushed from parent TelehealthRoomModal
  useEffect(() => {
    if (incomingMessages && incomingMessages.length > 0) {
      mergeMessages(incomingMessages);
    }
  }, [incomingMessages, mergeMessages]);

  const fetchMessages = useCallback(
    async (incremental = false) => {
      try {
        const params =
          incremental && lastCreatedAtRef.current ? { since: lastCreatedAtRef.current } : undefined;
        const res = await api.get(`/consultations/${appointmentId}/messages`, { params });
        const list = Array.isArray(res.data?.data) ? (res.data.data as ConsultationMessageDto[]) : [];
        if (incremental) {
          mergeMessages(list);
        } else {
          setMessages(list);
          if (list.length > 0) {
            lastCreatedAtRef.current = list[list.length - 1].createdAt;
          }
        }
        setError(null);
      } catch (err) {
        if (!incremental) {
          setError(getApiErrorMessage(err, 'Không tải được lịch sử tin nhắn.'));
        }
      } finally {
        if (!incremental) setLoading(false);
      }
    },
    [appointmentId, mergeMessages]
  );

  // Initial load
  useEffect(() => {
    setMessages([]);
    lastCreatedAtRef.current = null;
    setLoading(true);
    fetchMessages(false);
  }, [appointmentId, fetchMessages]);

  // Standalone STOMP subscription when opened outside TelehealthRoomModal
  useEffect(() => {
    if (parentManagesWs || !appointmentId) return;
    const client = createTelehealthStompClient({
      onConnect: () => {
        setLocalWsConnected(true);
        client.subscribe(`/topic/consultation.${appointmentId}.messages`, (frame) => {
          try {
            const msg = JSON.parse(frame.body) as ConsultationMessageDto;
            mergeMessages([msg]);
          } catch {
            // ignore malformed frame
          }
        });
      },
      onDisconnect: () => setLocalWsConnected(false),
      onError: () => setLocalWsConnected(false),
    });
    client.activate();
    return () => {
      setLocalWsConnected(false);
      void client.deactivate();
    };
  }, [appointmentId, parentManagesWs, mergeMessages]);

  const effectiveWsConnected = parentManagesWs ? parentWsConnected : localWsConnected;

  // REST polling fallback when WS is disconnected (and gentle safety sync when connected)
  useEffect(() => {
    const intervalMs = effectiveWsConnected ? 12000 : 3000;
    const timer = window.setInterval(() => {
      void fetchMessages(true);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [effectiveWsConnected, fetchMessages]);

  // Auto-scroll to newest message
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || sending || uploading || disabled) return;
    try {
      setSending(true);
      setError(null);
      const res = await api.post(`/consultations/${appointmentId}/messages`, {
        messageType: 'TEXT',
        content,
      });
      const created = res.data?.data as ConsultationMessageDto | undefined;
      if (created) mergeMessages([created]);
      setDraft('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể gửi tin nhắn.'));
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Chỉ hỗ trợ ảnh (JPG, PNG, WEBP, GIF) hoặc tệp PDF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Kích thước tệp đính kèm tối đa là 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'consultation');
      const uploadRes = await api.post('/storage/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = uploadRes.data?.data?.url as string | undefined;
      if (!url) throw new Error('missing url');

      const caption = draft.trim() || file.name;
      const msgRes = await api.post(`/consultations/${appointmentId}/messages`, {
        messageType: 'IMAGE',
        content: caption,
        attachmentUrl: url,
      });
      const created = msgRes.data?.data as ConsultationMessageDto | undefined;
      if (created) mergeMessages([created]);
      setDraft('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không thể tải tệp lên. Vui lòng thử lại.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900/95 border border-slate-800 text-slate-100' : 'bg-slate-50 border border-slate-200 text-slate-900'
      } ${className}`}
    >
      {/* Chat Header (Optional) */}
      {showHeader && (
        <div
          className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="min-w-0">
            <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Trao đổi trực tiếp {partnerName ? `với ${partnerName}` : ''}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span>Bảo mật hồ sơ y tế</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
              effectiveWsConnected
                ? isDark
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title={effectiveWsConnected ? 'Kết nối thời gian thực WebSocket' : 'Đang đồng bộ tự động qua REST'}
          >
            {effectiveWsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{effectiveWsConnected ? 'Realtime' : 'Sync'}</span>
          </span>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[220px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2 py-8">
            <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
            <span>Đang tải tin nhắn...</span>
          </div>
        ) : messages.length === 0 ? (
          <div
            className={`h-full flex flex-col items-center justify-center text-center px-4 py-8 text-xs space-y-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Chưa có tin nhắn nào</p>
            <p className="max-w-xs text-[11px] leading-relaxed">
              Hãy gửi lời chào, mô tả triệu chứng hoặc đính kèm ảnh kết quả xét nghiệm / đơn thuốc.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = currentUserId ? msg.senderId === currentUserId : false;
            const isNote = msg.messageType === 'PRESCRIPTION_NOTE';
            const pdf = isPdfUrl(msg.attachmentUrl, msg.content);

            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {isOwn ? 'Bạn' : msg.senderRole === 'DOCTOR' ? `BS. ${msg.senderName}` : msg.senderName}
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums font-mono">
                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                    isNote
                      ? isDark
                        ? 'bg-emerald-950/70 text-emerald-100 border border-emerald-500/40 rounded-2xl'
                        : 'bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-2xl'
                      : isOwn
                      ? 'bg-teal-600 text-white rounded-2xl rounded-tr-xs shadow-md'
                      : isDark
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-2xl rounded-tl-xs shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-xs shadow-sm'
                  }`}
                >
                  {isNote && (
                    <div
                      className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${
                        isDark ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                    >
                      Ghi chú chuyên môn / Đơn thuốc
                    </div>
                  )}

                  {msg.attachmentUrl && (
                    <div className="mb-2">
                      {pdf ? (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition ${
                            isOwn
                              ? 'bg-teal-700/70 border-teal-400/40 text-white hover:bg-teal-700'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-teal-300 hover:bg-slate-950'
                              : 'bg-slate-50 border-slate-200 text-teal-700 hover:bg-slate-100'
                          }`}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate max-w-[170px]">{msg.content || 'Tài liệu y khoa PDF'}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      ) : (
                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={msg.attachmentUrl}
                            alt={msg.content || 'Hình ảnh y khoa'}
                            className="max-h-48 rounded-xl object-cover border border-black/10 shadow-sm"
                          />
                        </a>
                      )}
                    </div>
                  )}

                  {msg.content && !(msg.attachmentUrl && pdf) && (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Error Bar */}
      {error && (
        <div
          className={`px-3 py-1.5 border-t text-[11px] font-medium flex items-center justify-between ${
            isDark ? 'bg-rose-950/80 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSendText}
        className={`p-3 border-t flex items-center gap-2 shrink-0 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending || disabled}
          title="Đính kèm ảnh hoặc PDF kết quả xét nghiệm"
          className={`p-2.5 rounded-xl border transition cursor-pointer disabled:opacity-50 shrink-0 ${
            isDark
              ? 'text-slate-400 hover:text-teal-300 hover:bg-slate-800 border-slate-700/80'
              : 'text-slate-500 hover:text-teal-700 hover:bg-teal-50 border-slate-200'
          }`}
          aria-label="Đính kèm ảnh hoặc PDF"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-teal-500" /> : <ImagePlus className="w-4 h-4" />}
        </button>

        <textarea
          rows={1}
          value={draft}
          disabled={sending || uploading || disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSendText();
            }
          }}
          placeholder={uploading ? 'Đang tải tệp lên...' : 'Nhập tin nhắn cho cuộc khám...'}
          className={`flex-1 resize-none text-xs sm:text-[13px] leading-relaxed rounded-xl px-3.5 py-2.5 outline-none transition max-h-24 ${
            isDark
              ? 'bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:bg-white'
          }`}
        />

        <button
          type="submit"
          disabled={!draft.trim() || sending || uploading || disabled}
          className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
          aria-label="Gửi tin nhắn"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">Gửi</span>
        </button>
      </form>
    </div>
  );
};
