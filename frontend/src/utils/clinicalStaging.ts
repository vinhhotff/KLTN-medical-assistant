/**
 * Bộ giải thuật y khoa & đánh giá sinh hiệu trực quan theo khuyến cáo chính thống:
 * 1. Phân độ Tăng Huyết Áp theo Hội Tim Mạch Học Quốc Gia Việt Nam (VNHA) & Hội Tim Mạch Châu Âu (ESC).
 * 2. Phân loại Thể Trạng BMI theo chuẩn WHO Khu Vực Tây Thái Bình Dương / Châu Á (IDI & WPRO cho người Việt Nam).
 * 3. Đánh giá ngưỡng SpO2 & Tần số tim (Heart Rate).
 */

export interface BloodPressureEvaluation {
  stage: 'OPTIMAL' | 'NORMAL' | 'HIGH_NORMAL' | 'GRADE_1' | 'GRADE_2' | 'CRISIS' | 'ISOLATED_SYSTOLIC' | 'UNKNOWN';
  label: string;
  badgeText: string;
  severity: 'optimal' | 'normal' | 'warning' | 'orange' | 'danger' | 'critical' | 'neutral';
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  advice: string;
  isCrisis: boolean;
}

export interface BmiEvaluation {
  bmi: number;
  stage: 'UNDERWEIGHT' | 'NORMAL' | 'PRE_OBESE' | 'OBESE_1' | 'OBESE_2' | 'UNKNOWN';
  label: string;
  badgeText: string;
  severity: 'underweight' | 'normal' | 'warning' | 'orange' | 'danger' | 'neutral';
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  advice: string;
}

export interface SpO2Evaluation {
  label: string;
  badgeText: string;
  severity: 'normal' | 'warning' | 'danger';
  colorClass: string;
  badgeClass: string;
}

export interface HeartRateEvaluation {
  label: string;
  badgeText: string;
  severity: 'bradycardia' | 'normal' | 'tachycardia';
  colorClass: string;
  badgeClass: string;
}

/**
 * Phân độ Huyết Áp theo Khuyến cáo Hội Tim Mạch Quốc Gia Việt Nam (VNHA) & ESC
 * Lấy mức phân độ cao hơn giữa huyết áp tâm thu (SBP) và tâm trương (DBP).
 */
export function evaluateBloodPressure(
  systolicStr: string | number | undefined,
  diastolicStr: string | number | undefined
): BloodPressureEvaluation {
  const sbp = Number(systolicStr);
  const dbp = Number(diastolicStr);

  if (!sbp || !dbp || isNaN(sbp) || isNaN(dbp)) {
    return {
      stage: 'UNKNOWN',
      label: 'Chưa đủ dữ liệu HA',
      badgeText: 'Chưa đo HA',
      severity: 'neutral',
      bgClass: 'bg-slate-50',
      borderClass: 'border-slate-200',
      textClass: 'text-slate-600',
      badgeBgClass: 'bg-slate-100',
      badgeTextClass: 'text-slate-600',
      advice: 'Cần đo cả huyết áp tâm thu và tâm trương.',
      isCrisis: false,
    };
  }

  // 1. Cơn Tăng Huyết Áp Khẩn Cấp (Hypertensive Crisis / Emergency)
  if (sbp >= 180 || dbp >= 110) {
    return {
      stage: 'CRISIS',
      label: 'Cơn Tăng Huyết Áp Khẩn Cấp (Hypertensive Crisis)',
      badgeText: '⚠️ Cơn THA Khẩn Cấp',
      severity: 'critical',
      bgClass: 'bg-rose-50/90',
      borderClass: 'border-rose-400',
      textClass: 'text-rose-900',
      badgeBgClass: 'bg-rose-600 animate-pulse',
      badgeTextClass: 'text-white',
      advice: 'Nguy cơ tai biến mạch máu não / biến cố tim mạch cấp. Cần hạ áp và theo dõi sát lâm sàng.',
      isCrisis: true,
    };
  }

  // 2. Tăng Huyết Áp Tâm Thu Đơn Độc (Isolated Systolic Hypertension)
  if (sbp >= 140 && dbp < 90) {
    return {
      stage: 'ISOLATED_SYSTOLIC',
      label: 'Tăng Huyết Áp Tâm Thu Đơn Độc',
      badgeText: 'THA Tâm Thu Đơn Độc',
      severity: 'orange',
      bgClass: 'bg-amber-50/80',
      borderClass: 'border-amber-300',
      textClass: 'text-amber-900',
      badgeBgClass: 'bg-amber-500',
      badgeTextClass: 'text-white',
      advice: 'Hay gặp ở người cao tuổi do xơ cứng động mạch. Cần điều trị kiểm soát tâm thu cẩn trọng.',
      isCrisis: false,
    };
  }

  // 3. Tăng Huyết Áp Độ 2 (Grade 2)
  if (sbp >= 160 || dbp >= 100) {
    return {
      stage: 'GRADE_2',
      label: 'Tăng Huyết Áp Độ 2 (VNHA/ESC)',
      badgeText: 'THA Độ 2',
      severity: 'danger',
      bgClass: 'bg-rose-50/70',
      borderClass: 'border-rose-300',
      textClass: 'text-rose-900',
      badgeBgClass: 'bg-rose-500',
      badgeTextClass: 'text-white',
      advice: 'Cần phối hợp thuốc hạ áp và điều chỉnh lối sống, theo dõi sát đáp ứng điều trị.',
      isCrisis: false,
    };
  }

  // 4. Tăng Huyết Áp Độ 1 (Grade 1)
  if (sbp >= 140 || dbp >= 90) {
    return {
      stage: 'GRADE_1',
      label: 'Tăng Huyết Áp Độ 1 (VNHA/ESC)',
      badgeText: 'THA Độ 1',
      severity: 'orange',
      bgClass: 'bg-orange-50/70',
      borderClass: 'border-orange-300',
      textClass: 'text-orange-900',
      badgeBgClass: 'bg-orange-500',
      badgeTextClass: 'text-white',
      advice: 'Khởi đầu thay đổi lối sống hoặc dùng đơn trị liệu thuốc hạ áp theo chỉ định.',
      isCrisis: false,
    };
  }

  // 5. Tiền Tăng Huyết Áp / Huyết Áp Bình Thường Cao (High-normal)
  if ((sbp >= 130 && sbp <= 139) || (dbp >= 85 && dbp <= 89)) {
    return {
      stage: 'HIGH_NORMAL',
      label: 'Tiền Tăng Huyết Áp (Bình thường cao)',
      badgeText: 'Tiền THA',
      severity: 'warning',
      bgClass: 'bg-amber-50/60',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-800',
      badgeBgClass: 'bg-amber-100 border border-amber-300',
      badgeTextClass: 'text-amber-900',
      advice: 'Nguy cơ tiến triển thành THA. Cần giảm ăn mặn, giảm cân và tăng vận động.',
      isCrisis: false,
    };
  }

  // 6. Huyết Áp Bình Thường (Normal)
  if ((sbp >= 120 && sbp <= 129) || (dbp >= 80 && dbp <= 84)) {
    return {
      stage: 'NORMAL',
      label: 'Huyết Áp Bình Thường (Normal)',
      badgeText: 'HA Bình Thường',
      severity: 'normal',
      bgClass: 'bg-emerald-50/50',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-800',
      badgeBgClass: 'bg-emerald-100 border border-emerald-300',
      badgeTextClass: 'text-emerald-800',
      advice: 'Huyết áp trong giới hạn bình thường. Tiếp tục duy trì chế độ sinh hoạt lành mạnh.',
      isCrisis: false,
    };
  }

  // 7. Huyết Áp Tối Ưu (Optimal)
  return {
    stage: 'OPTIMAL',
    label: 'Huyết Áp Tối Ưu (Optimal)',
    badgeText: 'HA Tối Ưu',
    severity: 'optimal',
    bgClass: 'bg-teal-50/50',
    borderClass: 'border-teal-200',
    textClass: 'text-teal-900',
    badgeBgClass: 'bg-teal-100 border border-teal-300',
    badgeTextClass: 'text-teal-800',
    advice: 'Chỉ số huyết áp rất tốt và lý tưởng cho hệ tim mạch.',
    isCrisis: false,
  };
}

/**
 * Phân loại Thể Trạng & BMI theo chuẩn WHO Khu Vực Tây Thái Bình Dương / Châu Á (IDI & WPRO)
 * Dành riêng cho người trưởng thành Việt Nam.
 */
export function evaluateBmiAsia(
  weightStr: string | number | undefined,
  heightStr: string | number | undefined,
  precalculatedBmi?: number
): BmiEvaluation {
  let bmi = precalculatedBmi || 0;

  if (!bmi) {
    const w = Number(weightStr);
    const h = Number(heightStr);
    if (w > 0 && h > 0) {
      const heightInMeters = h > 3 ? h / 100 : h;
      bmi = Number((w / (heightInMeters * heightInMeters)).toFixed(1));
    }
  }

  if (!bmi || isNaN(bmi) || bmi <= 0) {
    return {
      bmi: 0,
      stage: 'UNKNOWN',
      label: 'Chưa đủ dữ liệu chiều cao / cân nặng',
      badgeText: 'Chưa tính BMI',
      severity: 'neutral',
      bgClass: 'bg-slate-50',
      borderClass: 'border-slate-200',
      textClass: 'text-slate-600',
      badgeBgClass: 'bg-slate-100',
      badgeTextClass: 'text-slate-600',
      advice: 'Cần nhập chiều cao (cm) và cân nặng (kg).',
    };
  }

  // 1. Gầy / Thiếu cân (< 18.5)
  if (bmi < 18.5) {
    return {
      bmi,
      stage: 'UNDERWEIGHT',
      label: 'Thể Trạng Gầy / Thiếu Cân (WHO Châu Á)',
      badgeText: 'Thiếu Cân (Gầy)',
      severity: 'underweight',
      bgClass: 'bg-sky-50/70',
      borderClass: 'border-sky-200',
      textClass: 'text-sky-900',
      badgeBgClass: 'bg-sky-100 border border-sky-300',
      badgeTextClass: 'text-sky-800',
      advice: 'Cần tăng cường dinh dưỡng, bổ sung năng lượng và đạm để nâng cao thể trạng miễn dịch.',
    };
  }

  // 2. Bình thường (18.5 - 22.9)
  if (bmi <= 22.9) {
    return {
      bmi,
      stage: 'NORMAL',
      label: 'Thể Trạng Bình Thường / Lý Tưởng (WHO Châu Á)',
      badgeText: 'Thể Trạng Chuẩn',
      severity: 'normal',
      bgClass: 'bg-emerald-50/50',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-900',
      badgeBgClass: 'bg-emerald-100 border border-emerald-300',
      badgeTextClass: 'text-emerald-800',
      advice: 'Chỉ số thể trọng chuẩn đẹp theo người Việt Nam. Duy trì chế độ ăn và vận động đều đặn.',
    };
  }

  // 3. Tiền béo phì / Thừa cân (23.0 - 24.9)
  if (bmi <= 24.9) {
    return {
      bmi,
      stage: 'PRE_OBESE',
      label: 'Tiền Béo Phì / Thừa Cân (WHO Châu Á)',
      badgeText: 'Tiền Béo Phì',
      severity: 'warning',
      bgClass: 'bg-amber-50/70',
      borderClass: 'border-amber-300',
      textClass: 'text-amber-900',
      badgeBgClass: 'bg-amber-500',
      badgeTextClass: 'text-white',
      advice: 'Bắt đầu có nguy cơ tim mạch và đái tháo đường. Cần kiểm soát lượng tinh bột và tập thể dục 30p/ngày.',
    };
  }

  // 4. Béo phì Độ 1 (25.0 - 29.9)
  if (bmi <= 29.9) {
    return {
      bmi,
      stage: 'OBESE_1',
      label: 'Béo Phì Độ I (WHO Châu Á)',
      badgeText: 'Béo Phì Độ I',
      severity: 'orange',
      bgClass: 'bg-orange-50/80',
      borderClass: 'border-orange-300',
      textClass: 'text-orange-900',
      badgeBgClass: 'bg-orange-600',
      badgeTextClass: 'text-white',
      advice: 'Tăng nguy cơ bệnh tim mạch, mỡ máu và gan nhiễm mỡ. Khuyến cáo giảm cân chủ động 5-10% thể trọng.',
    };
  }

  // 5. Béo phì Độ 2 (>= 30.0)
  return {
    bmi,
    stage: 'OBESE_2',
    label: 'Béo Phì Độ II (Nguy Hiểm - WHO Châu Á)',
    badgeText: 'Béo Phì Độ II',
    severity: 'danger',
    bgClass: 'bg-rose-50/90',
    borderClass: 'border-rose-400',
    textClass: 'text-rose-900',
    badgeBgClass: 'bg-rose-600',
    badgeTextClass: 'text-white',
    advice: 'Nguy cơ cao các biến chứng mạch vành, đột quỵ và hội chứng chuyển hóa. Cần can thiệp y khoa tích cực.',
  };
}

/**
 * Đánh giá chỉ số bão hòa oxy máu mao mạch SpO2
 */
export function evaluateSpO2(spO2Val: string | number | undefined): SpO2Evaluation {
  const v = Number(spO2Val);
  if (!v || isNaN(v)) {
    return {
      label: 'Chưa đo SpO2',
      badgeText: 'Chưa đo',
      severity: 'normal',
      colorClass: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-600',
    };
  }
  if (v >= 96) {
    return {
      label: 'Bão hòa Oxy Tốt (≥ 96%)',
      badgeText: 'Bình Thường',
      severity: 'normal',
      colorClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
  }
  if (v >= 94) {
    return {
      label: 'Cần Theo Dõi (94 - 95%)',
      badgeText: 'Hơi Giảm',
      severity: 'warning',
      colorClass: 'text-amber-700',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    };
  }
  return {
    label: 'Cảnh Báo Thiếu Oxy Mô (< 94%)',
    badgeText: 'Suy Hô Hấp Cấp',
    severity: 'danger',
    colorClass: 'text-rose-700 font-black',
    badgeClass: 'bg-rose-600 text-white animate-pulse',
  };
}

/**
 * Đánh giá tần số tim / nhịp mạch (Heart Rate)
 */
export function evaluateHeartRate(hrVal: string | number | undefined): HeartRateEvaluation {
  const v = Number(hrVal);
  if (!v || isNaN(v)) {
    return {
      label: 'Chưa đo mạch',
      badgeText: 'Chưa đo',
      severity: 'normal',
      colorClass: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-600',
    };
  }
  if (v < 60) {
    return {
      label: 'Nhịp Tim Chậm (< 60 bpm)',
      badgeText: 'Mạch Chậm',
      severity: 'bradycardia',
      colorClass: 'text-sky-700',
      badgeClass: 'bg-sky-100 text-sky-800 border border-sky-200',
    };
  }
  if (v <= 100) {
    return {
      label: 'Nhịp Tim Bình Thường (60 - 100 bpm)',
      badgeText: 'Bình Thường',
      severity: 'normal',
      colorClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
  }
  return {
    label: 'Nhịp Tim Nhanh (> 100 bpm)',
    badgeText: 'Mạch Nhanh',
    severity: 'tachycardia',
    colorClass: 'text-rose-700',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
  };
}

export interface News2SubScores {
  respiratoryRate: number;
  spO2: number;
  systolicBp: number;
  heartRate: number;
  temperature: number;
}

export interface News2Evaluation {
  totalScore: number;
  subScores: News2SubScores;
  hasSingleScore3: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  label: string;
  badgeText: string;
  badgeClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  recommendation: string;
  hasData: boolean;
}

/**
 * Thang điểm Cảnh Báo Sớm Quốc Gia NEWS-2 (National Early Warning Score 2)
 * Tính điểm thời gian thực dựa trên 5 thông số sinh hiệu chính:
 * 1. Nhịp thở (Respiratory Rate)
 * 2. Độ bão hòa oxy máu mao mạch (SpO2)
 * 3. Huyết áp tâm thu (Systolic Blood Pressure)
 * 4. Tần số tim / nhịp mạch (Heart Rate)
 * 5. Thân nhiệt (Temperature)
 */
export function evaluateNews2Score(
  respiratoryRateVal: string | number | undefined,
  spO2Val: string | number | undefined,
  systolicBpVal: string | number | undefined,
  heartRateVal: string | number | undefined,
  temperatureVal: string | number | undefined
): News2Evaluation {
  const parseVal = (val: string | number | undefined): number | null => {
    if (val === undefined || val === null || val === '') return null;
    const n = typeof val === 'number' ? val : Number(String(val).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const rrRaw = parseVal(respiratoryRateVal);
  const spo2Raw = parseVal(spO2Val);
  const sbpRaw = parseVal(systolicBpVal);
  const hrRaw = parseVal(heartRateVal);
  const tempRaw = parseVal(temperatureVal);

  const hasAnyMeasurement =
    rrRaw !== null || spo2Raw !== null || sbpRaw !== null || hrRaw !== null || tempRaw !== null;

  // 1. Nhịp thở: nếu chưa nhập nhưng có các chỉ số khác, mặc định 16 lần/phút (0 điểm theo chuẩn sinh lý)
  let rrScore = 0;
  const effectiveRr = rrRaw !== null ? rrRaw : 16;
  if (effectiveRr <= 8) rrScore = 3;
  else if (effectiveRr <= 11) rrScore = 1;
  else if (effectiveRr <= 20) rrScore = 0;
  else if (effectiveRr <= 24) rrScore = 2;
  else rrScore = 3;

  // 2. SpO2 (%)
  let spo2Score = 0;
  if (spo2Raw !== null) {
    if (spo2Raw <= 91) spo2Score = 3;
    else if (spo2Raw <= 93) spo2Score = 2;
    else if (spo2Raw <= 95) spo2Score = 1;
    else spo2Score = 0;
  }

  // 3. Huyết áp tâm thu (mmHg)
  let sbpScore = 0;
  if (sbpRaw !== null) {
    if (sbpRaw <= 90) sbpScore = 3;
    else if (sbpRaw <= 100) sbpScore = 2;
    else if (sbpRaw <= 110) sbpScore = 1;
    else if (sbpRaw <= 219) sbpScore = 0;
    else sbpScore = 3;
  }

  // 4. Mạch / Tần số tim (bpm)
  let hrScore = 0;
  if (hrRaw !== null) {
    if (hrRaw <= 40) hrScore = 3;
    else if (hrRaw <= 50) hrScore = 1;
    else if (hrRaw <= 90) hrScore = 0;
    else if (hrRaw <= 110) hrScore = 1;
    else if (hrRaw <= 130) hrScore = 2;
    else hrScore = 3;
  }

  // 5. Thân nhiệt (°C)
  let tempScore = 0;
  if (tempRaw !== null) {
    if (tempRaw <= 35.0) tempScore = 3;
    else if (tempRaw <= 36.0) tempScore = 1;
    else if (tempRaw <= 38.0) tempScore = 0;
    else if (tempRaw <= 39.0) tempScore = 1;
    else tempScore = 2;
  }

  const subScores: News2SubScores = {
    respiratoryRate: rrScore,
    spO2: spo2Score,
    systolicBp: sbpScore,
    heartRate: hrScore,
    temperature: tempScore
  };

  const totalScore = rrScore + spo2Score + sbpScore + hrScore + tempScore;
  const hasSingleScore3 =
    rrScore === 3 || spo2Score === 3 || sbpScore === 3 || hrScore === 3 || tempScore === 3;

  // Phân tầng nguy cơ theo chuẩn NEWS-2:
  // - 0 - 4: Low Risk (Green) "Nguy cơ thấp - Ổn định lâm sàng"
  // - 5 - 6 (hoặc có điểm đơn lẻ 3): Medium Risk (Amber) "Nguy cơ trung bình - Cần theo dõi sát"
  // - >= 7: High Risk (Red) "Nguy cơ cao - Cảnh báo suy sụp lâm sàng cấp tính"
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  let label: string;
  let badgeText: string;
  let badgeClass: string;
  let bgClass: string;
  let borderClass: string;
  let textClass: string;
  let recommendation: string;

  if (totalScore >= 7) {
    riskLevel = 'HIGH';
    label = 'Nguy cơ cao - Cảnh báo suy sụp lâm sàng cấp tính';
    badgeText = `NEWS-2: ${totalScore} điểm (Nguy cơ cao)`;
    badgeClass = 'bg-rose-600 text-white animate-pulse shadow-sm';
    bgClass = 'bg-rose-50/90';
    borderClass = 'border-rose-400';
    textClass = 'text-rose-950';
    recommendation = 'Khẩn cấp: Nguy cơ suy sụp lâm sàng cấp tính đe dọa tính mạng. Bác sĩ cần đánh giá cấp cứu ngay lập tức và theo dõi liên tục.';
  } else if (totalScore >= 5 || hasSingleScore3) {
    riskLevel = 'MEDIUM';
    label = 'Nguy cơ trung bình - Cần theo dõi sát';
    badgeText = hasSingleScore3 && totalScore < 5
      ? `NEWS-2: ${totalScore} điểm (Nguy cơ trung bình - Điểm đơn lẻ 3)`
      : `NEWS-2: ${totalScore} điểm (Nguy cơ trung bình)`;
    badgeClass = 'bg-amber-500 text-white shadow-sm';
    bgClass = 'bg-amber-50/90';
    borderClass = 'border-amber-400';
    textClass = 'text-amber-950';
    recommendation = hasSingleScore3 && totalScore < 5
      ? 'Cảnh báo: Có ít nhất một chỉ số sinh hiệu ở mức báo động đỏ (3 điểm). Cần theo dõi sát và cân nhắc can thiệp y tế khẩn.'
      : 'Bệnh nhân có nguy cơ diễn tiến bất lợi. Cần theo dõi sát các dấu hiệu sinh tồn và đánh giá lại đáp ứng lâm sàng thường xuyên.';
  } else {
    riskLevel = 'LOW';
    label = 'Nguy cơ thấp - Ổn định lâm sàng';
    badgeText = `NEWS-2: ${totalScore} điểm (Nguy cơ thấp)`;
    badgeClass = 'bg-emerald-600 text-white shadow-sm';
    bgClass = 'bg-emerald-50/70';
    borderClass = 'border-emerald-300';
    textClass = 'text-emerald-950';
    recommendation = 'Dấu hiệu sinh tồn trong giới hạn an toàn, ổn định lâm sàng. Tiếp tục theo dõi và điều trị theo phác đồ thường quy.';
  }

  return {
    totalScore,
    subScores,
    hasSingleScore3,
    riskLevel,
    label,
    badgeText,
    badgeClass,
    bgClass,
    borderClass,
    textClass,
    recommendation,
    hasData: hasAnyMeasurement
  };
}

/**
 * Tạo câu nhận xét lâm sàng tự động chuẩn y khoa để nạp vào Lời dặn dò / Kế hoạch điều trị
 */
export function generateClinicalVitalsNote(
  systolic: string | number,
  diastolic: string | number,
  weight: string | number,
  height: string | number,
  respiratoryRate?: string | number,
  spO2?: string | number,
  heartRate?: string | number,
  temperature?: string | number
): string {
  const bp = evaluateBloodPressure(systolic, diastolic);
  const bmi = evaluateBmiAsia(weight, height);
  const news2 = evaluateNews2Score(respiratoryRate, spO2, systolic, heartRate, temperature);

  const parts: string[] = [];
  if (bp.stage !== 'UNKNOWN') {
    parts.push(`Huyết áp ${systolic}/${diastolic} mmHg (${bp.label}).`);
  }
  if (bmi.stage !== 'UNKNOWN') {
    parts.push(`Thể trạng: BMI ${bmi.bmi} kg/m² (${bmi.badgeText} theo chuẩn WHO Châu Á).`);
  }
  if (news2.hasData) {
    parts.push(`Thang điểm cảnh báo sớm NEWS-2: ${news2.totalScore} điểm (${news2.label}).`);
  }

  const adviceParts: string[] = [];
  if (bp.advice) adviceParts.push(bp.advice);
  if (bmi.advice) adviceParts.push(bmi.advice);
  if (news2.hasData && news2.recommendation) adviceParts.push(news2.recommendation);

  if (parts.length === 0) return '';

  return `[ĐÁNH GIÁ THỂ TRẠNG & SINH HIỆU]: ${parts.join(' ')}\n[KHUYẾN CÁO LỐI SỐNG & LÂM SÀNG]: ${adviceParts.join(' ')}`;
}
