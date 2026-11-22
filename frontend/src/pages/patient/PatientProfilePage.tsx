import React, { useEffect, useMemo, useState } from 'react';
import { Check, CircleAlert, Plus, X, Sparkles, Phone } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Button, ErrorState, Skeleton, useToast, cn } from '../../components/ui';
import { getApiErrorMessage } from '../../utils/apiError';
import { todayLocal } from '../../utils/date';
import { initialsOf, type PatientProfileData } from '../../types/patient';

const GENDERS = [
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'MALE', label: 'Nam' },
  { value: 'OTHER', label: 'Khác' },
];
const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMMON_CONDITIONS = ['Tăng huyết áp', 'Đái tháo đường', 'Bệnh tim mạch', 'Rối loạn mỡ máu', 'Hen suyễn / COPD', 'Bệnh dạ dày – tá tràng', 'Bệnh gan', 'Bệnh thận'];
const RELATIONSHIPS = ['', 'Vợ', 'Chồng', 'Bố', 'Mẹ', 'Con', 'Anh/Chị/Em', 'Bạn', 'Khác'];

const SECTIONS = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'health', label: 'Thông tin sức khỏe' },
  { id: 'emergency', label: 'Liên hệ khẩn cấp' },
];

const splitList = (s?: string | null) =>
  (s || '')
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500';

const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800 mb-1.5">
    {children}
  </label>
);
const FieldError: React.FC<{ msg?: string }> = ({ msg }) => (msg ? <p className="mt-1 text-xs text-rose-700">{msg}</p> : null);

export const PatientProfilePage: React.FC = () => {
  const toast = useToast();
  const { refreshCurrentUser } = useAuthStore();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [form, setForm] = useState<Partial<PatientProfileData>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [allergyDraft, setAllergyDraft] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get('/patient/profile');
      if (res.data?.data) {
        setProfile(res.data.data);
        setForm(res.data.data);
      }
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Không tải được hồ sơ.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const set = <K extends keyof PatientProfileData>(key: K, value: PatientProfileData[K]) => setForm((f) => ({ ...f, [key]: value }));

  const errors = useMemo(() => {
    const errs: Partial<Record<keyof PatientProfileData, string>> = {};
    if (form.fullName !== undefined && !form.fullName.trim()) errs.fullName = 'Họ và tên không được để trống.';
    const phone = (form.phone || '').replace(/[\s\-.]/g, '');
    if (phone && !/^(0|\+84)(3[2-9]|5[6-9]|7[0-9]|8[1-9]|9[0-9])\d{7}$/.test(phone)) errs.phone = 'Số điện thoại không đúng định dạng Việt Nam (VD: 0901234567).';
    const bhyt = (form.healthInsuranceNumber || '').trim().toUpperCase();
    if (bhyt && !/^[A-Z]{2}[A-Z0-9]{10,14}$/.test(bhyt)) errs.healthInsuranceNumber = 'Số thẻ BHYT gồm 2 chữ cái đầu + 10–14 ký tự.';
    const cid = (form.citizenId || '').trim();
    if (cid && !/^\d{12}$/.test(cid)) errs.citizenId = 'Số CCCD gồm đúng 12 chữ số.';
    if (form.dateOfBirth && String(form.dateOfBirth) > todayLocal()) errs.dateOfBirth = 'Ngày sinh không được ở tương lai.';
    const ePhone = (form.emergencyContactPhone || '').replace(/\s/g, '');
    if (ePhone && !/^(\+?84|0)\d{9,10}$/.test(ePhone)) errs.emergencyContactPhone = 'Số điện thoại không hợp lệ.';
    return errs;
  }, [form]);

  const allergies = splitList(form.allergies);
  const history = form.medicalHistory || '';

  // Completeness is computed only from fields the backend actually stores
  const checks = [
    { label: 'Thông tin cơ bản', done: Boolean(form.fullName && form.dateOfBirth && form.gender && form.phone) },
    { label: 'Dị ứng', done: allergies.length > 0 },
    { label: 'Tiền sử bệnh', done: history.trim().length > 0 },
    { label: 'Người liên hệ khẩn cấp', done: Boolean(form.emergencyContactName && form.emergencyContactPhone) },
  ];
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  const dirty = JSON.stringify(form) !== JSON.stringify(profile ?? {});

  const addAllergy = () => {
    const v = allergyDraft.trim();
    if (!v) return;
    if (!allergies.some((a) => a.toLowerCase() === v.toLowerCase())) set('allergies', [...allergies, v].join(', '));
    setAllergyDraft('');
  };
  const removeAllergy = (a: string) => set('allergies', allergies.filter((x) => x !== a).join(', '));

  const historyHas = (c: string) => history.toLowerCase().includes(c.toLowerCase());
  const toggleCondition = (c: string) => {
    if (historyHas(c)) {
      const parts = splitList(history).filter((p) => p.toLowerCase() !== c.toLowerCase());
      set('medicalHistory', parts.join(', '));
    } else {
      set('medicalHistory', history.trim() ? `${history.trim().replace(/[,;]\s*$/, '')}, ${c}` : c);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving || Object.keys(errors).length > 0) return;
    try {
      setSaving(true);
      const res = await api.put('/patient/profile', form);
      if (res.data?.data) {
        setProfile(res.data.data);
        setForm(res.data.data);
        void refreshCurrentUser();
        toast.success('Đã lưu hồ sơ.');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể lưu hồ sơ.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (loadError) return <ErrorState message={loadError} onRetry={load} retrying={loading} />;

  return (
    <form onSubmit={handleSave} className="space-y-6" noValidate>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Hồ sơ của tôi</h1>
          <p className="mt-1.5 text-slate-600">
            Thông tin này giúp trợ lý AI hỏi đúng hơn và giúp bác sĩ nắm tình trạng của bạn trước buổi khám.
          </p>
        </div>
        <Button type="submit" loading={saving} disabled={!dirty} className="!bg-indigo-600 !border-indigo-600 hover:!bg-indigo-700 !rounded-lg">
          Lưu thay đổi
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 items-start">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Mức hoàn thành</span>
              <span className="text-lg font-bold text-slate-900">{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-4 space-y-2.5">
              {checks.map((c) => (
                <li key={c.label} className={cn('flex items-center gap-2 text-sm', c.done ? 'text-slate-700' : 'text-orange-700')}>
                  {c.done ? <Check className="w-4 h-4 text-emerald-600" /> : <CircleAlert className="w-4 h-4" />}
                  {c.label}
                  {!c.done && ' · còn thiếu'}
                </li>
              ))}
            </ul>
          </div>
          <nav className="hidden lg:block bg-white rounded-2xl border border-slate-200 p-2" aria-label="Mục hồ sơ">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-5 min-w-0">
          {/* Basic info */}
          <section id="basic" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 scroll-mt-24">
            <h2 className="font-display text-lg font-bold text-slate-900">Thông tin cơ bản</h2>
            <div className="mt-4 flex items-center gap-4">
              <span className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 text-lg font-bold flex items-center justify-center">
                {initialsOf(form.fullName)}
              </span>
              {profile?.patientCode && <span className="text-sm text-slate-500">Mã bệnh nhân: {profile.patientCode}</span>}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fullName">Họ và tên</Label>
                <input id="fullName" className={inputCls} value={form.fullName || ''} onChange={(e) => set('fullName', e.target.value)} />
                <FieldError msg={errors.fullName} />
              </div>
              <div>
                <Label htmlFor="dob">Ngày sinh</Label>
                <input id="dob" type="date" max={todayLocal()} className={inputCls} value={form.dateOfBirth || ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
                <FieldError msg={errors.dateOfBirth} />
              </div>
              <fieldset>
                <legend className="block text-sm font-medium text-slate-800 mb-1.5">Giới tính</legend>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <label
                      key={g.value}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer',
                        form.gender === g.value ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-medium' : 'border-slate-300 text-slate-700',
                      )}
                    >
                      <input type="radio" name="gender" value={g.value} checked={form.gender === g.value} onChange={() => set('gender', g.value)} className="text-indigo-600 focus:ring-indigo-500" />
                      {g.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <input id="phone" inputMode="tel" className={inputCls} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
                <FieldError msg={errors.phone} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <input id="email" className={inputCls} value={form.email || ''} disabled />
                <p className="mt-1 text-xs text-slate-500">Email đăng nhập, không đổi được ở đây.</p>
              </div>
              <div>
                <Label htmlFor="blood">Nhóm máu</Label>
                <select id="blood" className={inputCls} value={form.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)}>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>
                      {b || 'Chưa rõ'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="cid">Số CCCD</Label>
                <input id="cid" inputMode="numeric" className={inputCls} value={form.citizenId || ''} onChange={(e) => set('citizenId', e.target.value)} />
                <FieldError msg={errors.citizenId} />
              </div>
              <div>
                <Label htmlFor="bhyt">Số thẻ BHYT</Label>
                <input id="bhyt" className={inputCls} value={form.healthInsuranceNumber || ''} onChange={(e) => set('healthInsuranceNumber', e.target.value)} />
                <FieldError msg={errors.healthInsuranceNumber} />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="address">Địa chỉ</Label>
                <input id="address" className={inputCls} value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Health info */}
          <section id="health" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 scroll-mt-24">
            <h2 className="font-display text-lg font-bold text-slate-900">Thông tin sức khỏe</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-indigo-700">
              <Sparkles className="w-3.5 h-3.5" /> Trợ lý AI và bác sĩ của bạn dùng phần này để không hỏi lại những gì bạn đã khai.
            </p>

            <div className="mt-5">
              <p className="text-sm font-medium text-slate-800 mb-2">Dị ứng thuốc hoặc thức ăn</p>
              <div className="flex flex-wrap items-center gap-2">
                {allergies.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-sm text-rose-800">
                    {a}
                    <button type="button" onClick={() => removeAllergy(a)} aria-label={`Bỏ ${a}`} className="cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 pl-3 pr-1 py-0.5">
                  <input
                    value={allergyDraft}
                    onChange={(e) => setAllergyDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAllergy();
                      }
                    }}
                    placeholder="Thêm dị ứng"
                    aria-label="Thêm dị ứng"
                    className="w-32 text-sm bg-transparent focus:outline-none"
                  />
                  <button type="button" onClick={addAllergy} className="p-1 rounded-full text-slate-500 hover:text-indigo-700 cursor-pointer" aria-label="Thêm">
                    <Plus className="w-4 h-4" />
                  </button>
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium text-slate-800">Bệnh đã mắc hoặc đang điều trị (bản thân và gia đình)</p>
                {!history.trim() && <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] text-amber-800">Chưa khai báo</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_CONDITIONS.map((c) => {
                  const on = historyHas(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCondition(c)}
                      aria-pressed={on}
                      className={cn(
                        'px-3 py-1.5 rounded-full border text-sm transition cursor-pointer',
                        on ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      {on && <Check className="inline w-3.5 h-3.5 mr-1" />}
                      {c}
                    </button>
                  );
                })}
              </div>
              <textarea
                rows={3}
                className={cn(inputCls, 'mt-3 resize-y')}
                value={history}
                onChange={(e) => set('medicalHistory', e.target.value)}
                placeholder="Ví dụ: tăng huyết áp từ 2020; bố bị đái tháo đường"
                aria-label="Tiền sử bệnh"
              />
            </div>
          </section>

          {/* Emergency contact */}
          <section id="emergency" className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 scroll-mt-24">
            <h2 className="font-display text-lg font-bold text-slate-900">Người liên hệ khẩn cấp</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-rose-700">
              <Phone className="w-3.5 h-3.5" /> Hiện ở màn hình cảnh báo cấp cứu để bạn gọi nhanh bằng một chạm.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ecName">Họ và tên</Label>
                <input id="ecName" className={inputCls} value={form.emergencyContactName || ''} onChange={(e) => set('emergencyContactName', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ecRel">Quan hệ</Label>
                <select id="ecRel" className={inputCls} value={form.emergencyContactRelationship || ''} onChange={(e) => set('emergencyContactRelationship', e.target.value)}>
                  {Array.from(new Set([...RELATIONSHIPS, form.emergencyContactRelationship || ''])).map((r) => (
                    <option key={r} value={r}>
                      {r || 'Chọn'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ecPhone">Số điện thoại</Label>
                <input id="ecPhone" inputMode="tel" className={inputCls} value={form.emergencyContactPhone || ''} onChange={(e) => set('emergencyContactPhone', e.target.value)} />
                <FieldError msg={errors.emergencyContactPhone} />
              </div>
            </div>
          </section>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {profile?.updatedAt ? `Cập nhật lần cuối ${new Date(profile.updatedAt).toLocaleString('vi-VN')}` : 'Chưa lưu lần nào'}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={!dirty || saving} onClick={() => setForm(profile ?? {})} className="!rounded-lg">
                Hủy
              </Button>
              <Button type="submit" loading={saving} disabled={!dirty} className="!bg-indigo-600 !border-indigo-600 hover:!bg-indigo-700 !rounded-lg">
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
