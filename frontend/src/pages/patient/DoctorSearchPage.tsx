import React, { useState } from 'react';
import { Search, Star, Calendar, MapPin, CheckCircle } from 'lucide-react';

interface DoctorCard {
  id: string;
  name: string;
  specialty: string;
  title: string;
  rating: number;
  reviewCount: number;
  hospital: string;
  fee: string;
}

const DOCTORS: DoctorCard[] = [
  {
    id: 'doc-1',
    name: 'TS. BS. Nguyễn Văn An',
    specialty: 'Tim Mạch Can Thiệp',
    title: 'Tiến sĩ Y khoa - Bác sĩ Tim Mạch',
    rating: 4.9,
    reviewCount: 128,
    hospital: 'BV Đại Học Y Dược TP.HCM',
    fee: '350.000 VNĐ / lượt',
  },
  {
    id: 'doc-2',
    name: 'BS. CKI. Lê Thu Hà',
    specialty: 'Da Liễu & Thẩm Mỹ',
    title: 'Chuyên gia Da liễu & Laser Thẩm mỹ',
    rating: 4.8,
    reviewCount: 95,
    hospital: 'BV Da Liễu Trung Ương',
    fee: '300.000 VNĐ / lượt',
  },
  {
    id: 'doc-3',
    name: 'PGS. TS. Trần Minh Tuấn',
    specialty: 'Nhi Khoa & Hô Hấp Trẻ Em',
    title: 'Giảng viên Cao cấp ĐH Y Dược',
    rating: 5.0,
    reviewCount: 210,
    hospital: 'BV Nhi Đồng 1',
    fee: '400.000 VNĐ / lượt',
  },
];

export const DoctorSearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookedDoctor, setBookedDoctor] = useState<string | null>(null);

  const filteredDoctors = DOCTORS.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.hospital.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tìm Kiếm & Đặt Lịch Khám Bác Sĩ</h2>
        <p className="text-slate-500 text-sm mt-1">
          Hệ thống tìm kiếm thông minh khớp chuyên khoa hoặc triệu chứng bằng Vector Similarity Search.
        </p>
      </div>

      {bookedDoctor && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Yêu cầu đặt lịch khám với <strong>{bookedDoctor}</strong> đã được tiếp nhận!</span>
          </div>
          <button onClick={() => setBookedDoctor(null)} className="text-xs font-semibold underline">
            Đóng
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Nhập tên bác sĩ, bệnh viện, hoặc triệu chứng như 'đau thắt ngực', 'mẩn đỏ'..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-4">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {doc.name.charAt(doc.name.length - 1)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                    {doc.specialty}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{doc.title}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {doc.hospital}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {doc.rating} ({doc.reviewCount} đánh giá)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <span className="text-sm font-bold text-indigo-600">{doc.fee}</span>
              <button
                onClick={() => setBookedDoctor(doc.name)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                <Calendar className="w-4 h-4" /> Đặt Khám Ngay
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
