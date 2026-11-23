/**
 * Clinical Drug Safety Engine:
 * 1. Drug-Drug Interaction (DDI) Detection for multi-item outpatient prescriptions.
 * 2. Cross-reactive Drug Allergy Screening against patient allergy profile.
 */

export interface DrugInteractionPair {
  id: string;
  drugAKeywords: string[];
  drugBKeywords: string[];
  pairName: string;
  severity: 'CRITICAL' | 'MAJOR';
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
}

export interface DetectedInteraction {
  pair: DrugInteractionPair;
  drug1: string;
  drug2: string;
  severity: 'CRITICAL' | 'MAJOR';
}

export interface AllergyConflict {
  drugName: string;
  activeIngredient?: string;
  matchedAllergyKeyword: string;
  groupName?: string;
  severity: 'CRITICAL' | 'MAJOR';
  explanation: string;
}

export interface DrugSafetyCheckResult {
  interactions: DetectedInteraction[];
  allergyConflicts: AllergyConflict[];
  hasCritical: boolean;
  hasMajor: boolean;
  isSafe: boolean;
}

/** Standard major clinical interactions known in pharmacology */
export const KNOWN_INTERACTIONS: DrugInteractionPair[] = [
  {
    id: 'warfarin-nsaid',
    drugAKeywords: ['warfarin', 'coumadin', 'sintrom', 'acenocoumarol', 'rivaroxaban', 'xarelto', 'apixaban', 'eliquis', 'dabigatran', 'pradaxa'],
    drugBKeywords: ['aspirin', 'aspegic', 'ibuprofen', 'advil', 'motrin', 'naproxen', 'diclofenac', 'voltaren', 'meloxicam', 'mobic', 'celecoxib', 'celebrex', 'ketorolac', 'piroxicam', 'indomethacin', 'nsaid'],
    pairName: 'Thuốc chống đông + Aspirin / NSAID',
    severity: 'CRITICAL',
    mechanism: 'Hiệp đồng ức chế đông máu và gây tổn thương trực tiếp niêm mạc đường tiêu hóa.',
    clinicalEffect: 'Tăng nguy cơ xuất huyết tiêu hóa nặng 3-5 lần và các biến cố chảy máu nghiêm trọng đe dọa tính mạng.',
    recommendation: 'Tránh phối hợp. Nếu cần giảm đau/hạ sốt, ưu tiên dùng Paracetamol. Nếu bắt buộc phối hợp, cần bổ sung thuốc ức chế bơm proton (PPI) để bảo vệ dạ dày.'
  },
  {
    id: 'clopidogrel-omeprazole',
    drugAKeywords: ['clopidogrel', 'plavix'],
    drugBKeywords: ['omeprazole', 'losec', 'esomeprazole', 'nexium'],
    pairName: 'Clopidogrel + Omeprazole / Esomeprazole',
    severity: 'MAJOR',
    mechanism: 'Omeprazole/Esomeprazole ức chế mạnh isoenzym CYP2C19, làm giảm chuyển hóa Clopidogrel thành chất chuyển hóa có hoạt tính chống kết tập tiểu cầu.',
    clinicalEffect: 'Làm giảm hiệu lực bảo vệ của Clopidogrel, tăng nguy cơ huyết khối tắc stent mạch vành và biến cố tim mạch tái phát.',
    recommendation: 'Cân nhắc thay thế Omeprazole / Esomeprazole bằng Pantoprazole (ít ức chế CYP2C19 hơn) hoặc thuốc kháng thụ thể H2.'
  },
  {
    id: 'statin-macrolide',
    drugAKeywords: ['simvastatin', 'zocor', 'atorvastatin', 'lipitor', 'lovastatin'],
    drugBKeywords: ['clarithromycin', 'klacid', 'erythromycin', 'macrolide'],
    pairName: 'Statin (Simvastatin/Atorvastatin) + Macrolide (Clarithromycin)',
    severity: 'CRITICAL',
    mechanism: 'Kháng sinh Macrolide ức chế mạnh CYP3A4, làm giảm thanh thải Statin qua gan.',
    clinicalEffect: 'Làm tăng nồng độ Statin trong huyết tương lên gấp 3-10 lần, nguy cơ cao gây tiêu cơ vân cấp (Rhabdomyolysis), myoglobin niệu và suy thận cấp.',
    recommendation: 'Tạm ngừng dùng Statin trong đợt điều trị Clarithromycin, hoặc chuyển sang kháng sinh khác (Azithromycin ít tương tác hơn) hoặc dùng Rosuvastatin liều thấp.'
  },
  {
    id: 'acei-arb-potassium',
    drugAKeywords: ['enalapril', 'lisinopril', 'perindopril', 'coversyl', 'captopril', 'losartan', 'valsartan', 'telmisartan', 'micardis', 'candesartan', 'irbesartan'],
    drugBKeywords: ['spironolactone', 'aldactone', 'kali', 'potassium', 'kalium', 'k-dur'],
    pairName: 'Ức chế men chuyển / ARB + Spironolactone / Bổ sung Kali',
    severity: 'MAJOR',
    mechanism: 'Hiệp đồng làm giảm bài tiết kali tại ống lượn xa qua trung gian ức chế Aldosterone.',
    clinicalEffect: 'Nguy cơ cao tăng kali máu nghiêm trọng (> 5.5 - 6.0 mmol/L), có thể gây loạn nhịp tim nguy hiểm và ngưng tim.',
    recommendation: 'Theo dõi chặt chẽ điện giải đồ (Kali máu) và chức năng thận (Creatinine) định kỳ khi dùng phối hợp.'
  },
  {
    id: 'dual-raas',
    drugAKeywords: ['enalapril', 'lisinopril', 'perindopril', 'coversyl', 'captopril'],
    drugBKeywords: ['losartan', 'valsartan', 'telmisartan', 'micardis', 'candesartan', 'irbesartan'],
    pairName: 'Ức chế men chuyển (ACEI) + Chẹn thụ thể (ARB)',
    severity: 'CRITICAL',
    mechanism: 'Phong bế kép cùng lúc hệ Renin-Angiotensin-Aldosterone (RAAS).',
    clinicalEffect: 'Tăng rõ rệt nguy cơ tụt huyết áp nặng, suy thận cấp và tăng kali máu mà không cải thiện tiên lượng tim mạch.',
    recommendation: 'Chống chỉ định phối hợp thường quy ACEI và ARB trong điều trị tăng huyết áp hoặc suy tim.'
  },
  {
    id: 'methotrexate-nsaid',
    drugAKeywords: ['methotrexate'],
    drugBKeywords: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'celecoxib', 'ketorolac', 'nsaid'],
    pairName: 'Methotrexate + NSAID / Aspirin',
    severity: 'CRITICAL',
    mechanism: 'NSAID cạnh tranh đào thải qua ống thận và đẩy Methotrexate khỏi liên kết protein huyết tương.',
    clinicalEffect: 'Tăng nồng độ Methotrexate tự do, gây độc tính tủy xương nặng (suy tủy, giảm bạch cầu/tiểu cầu), loét miệng và suy gan thận.',
    recommendation: 'Tránh dùng chung NSAID với Methotrexate liều trung bình - cao. Cần theo dõi công thức máu và chức năng thận nếu dùng liều thấp cho viêm khớp.'
  },
  {
    id: 'nitrate-pde5',
    drugAKeywords: ['nitroglycerin', 'nitromint', 'isosorbide', 'imdur', 'monoket'],
    drugBKeywords: ['sildenafil', 'viagra', 'tadalafil', 'cialis', 'vardenafil', 'levitra'],
    pairName: 'Nitrat hữu cơ + Thuốc ức chế PDE-5',
    severity: 'CRITICAL',
    mechanism: 'Hiệp đồng làm tăng nồng độ cGMP nội bào gây giãn cơ trơn mạch máu toàn thân nghiêm trọng.',
    clinicalEffect: 'Tụt huyết áp dữ dội, trụy mạch, có thể dẫn đến nhồi máu cơ tim cấp hoặc tử vong.',
    recommendation: 'Chống chỉ định tuyệt đối phối hợp. Không dùng Nitrat trong vòng 24 giờ sau Sildenafil hoặc 48 giờ sau Tadalafil.'
  },
  {
    id: 'digoxin-amiodarone',
    drugAKeywords: ['digoxin'],
    drugBKeywords: ['amiodarone', 'cordarone', 'verapamil'],
    pairName: 'Digoxin + Amiodarone / Verapamil',
    severity: 'CRITICAL',
    mechanism: 'Amiodarone và Verapamil ức chế P-glycoprotein đào thải Digoxin tại thận và mô.',
    clinicalEffect: 'Tăng nồng độ Digoxin huyết tương lên 70-100%, gây ngộ độc Digoxin với rối loạn nhịp thất ác tính, blốc nhĩ thất và tử vong.',
    recommendation: 'Giảm 50% liều Digoxin khi bắt đầu dùng chung và theo dõi nồng độ Digoxin trong máu định kỳ.'
  },
  {
    id: 'quinolone-corticoid',
    drugAKeywords: ['ciprofloxacin', 'cipro', 'levofloxacin', 'tavanic', 'moxifloxacin', 'avelox'],
    drugBKeywords: ['prednisolone', 'prednisone', 'methylprednisolone', 'medrol', 'dexamethasone', 'hydrocortisone'],
    pairName: 'Kháng sinh Quinolone + Corticosteroid',
    severity: 'MAJOR',
    mechanism: 'Hiệp đồng ức chế tổng hợp collagen và đẩy nhanh thoái hóa cấu trúc gân cơ.',
    clinicalEffect: 'Làm tăng nguy cơ viêm gân và đứt gân gót chân (Achilles tendon rupture), đặc biệt ở bệnh nhân trên 60 tuổi.',
    recommendation: 'Thận trọng khi phối hợp. Nhắc nhở người bệnh ngừng vận động mạnh và đến khám ngay nếu có dấu hiệu đau hoặc sưng gót chân.'
  },
  {
    id: 'ssri-tramadol',
    drugAKeywords: ['fluoxetine', 'prozac', 'sertraline', 'zoloft', 'escitalopram', 'lexapro', 'paroxetine'],
    drugBKeywords: ['tramadol', 'ultracet'],
    pairName: 'Thuốc chống trầm cảm SSRI + Tramadol',
    severity: 'CRITICAL',
    mechanism: 'Cả hai đều làm tăng nồng độ Serotonin tại synap thần kinh trung ương.',
    clinicalEffect: 'Nguy cơ cao khởi phát Hội chứng Serotonin (Serotonin Syndrome) đe dọa tính mạng: sốt cao ác tính, run giật cơ, kích động và co giật.',
    recommendation: 'Tránh phối hợp. Ưu tiên chọn thuốc giảm đau khác không có hoạt tính serotonergic.'
  }
];

export interface AllergyGroup {
  id: string;
  name: string;
  keywords: string[];
  crossWarning: string;
}

export const ALLERGY_GROUPS: AllergyGroup[] = [
  {
    id: 'penicillin',
    name: 'Kháng sinh nhóm Penicillin / Beta-lactam',
    keywords: [
      'penicillin',
      'amoxicillin',
      'ampicillin',
      'augmentin',
      'amox',
      'clavam',
      'unasyn',
      'cloxacillin',
      'oxacillin',
      'piperacillin',
      'beta-lactam',
      'betalactam'
    ],
    crossWarning: 'Nguy cơ dị ứng chéo và sốc phản vệ với mọi dẫn chất nhóm Penicillin.'
  },
  {
    id: 'cephalosporin',
    name: 'Kháng sinh nhóm Cephalosporin',
    keywords: [
      'cephalosporin',
      'cefalosporin',
      'cephalexin',
      'cefaclor',
      'cefuroxime',
      'zinnat',
      'cefixime',
      'ceftriaxone',
      'cefotaxime',
      'cefepime'
    ],
    crossWarning: 'Nguy cơ dị ứng chéo cao giữa các thế hệ Cephalosporin và một phần Penicillin.'
  },
  {
    id: 'sulfa',
    name: 'Kháng sinh nhóm Sulfonamide (Sulfa)',
    keywords: ['sulfa', 'sulfonamide', 'bactrim', 'septra', 'sulfamethoxazole', 'cotrimoxazole'],
    crossWarning: 'Nguy cơ hội chứng Stevens-Johnson hoặc phát ban dạng sởi nặng.'
  },
  {
    id: 'nsaid',
    name: 'Nhóm giảm đau kháng viêm NSAID / Aspirin',
    keywords: ['nsaid', 'aspirin', 'ibuprofen', 'advil', 'motrin', 'naproxen', 'diclofenac', 'voltaren', 'meloxicam', 'mobic', 'celecoxib', 'celebrex', 'ketorolac'],
    crossWarning: 'Nguy cơ co thắt phế quản cấp (cơn hen giả NSAID), phù Quincke hoặc mề đay.'
  },
  {
    id: 'macrolide',
    name: 'Kháng sinh nhóm Macrolide',
    keywords: ['macrolide', 'erythromycin', 'clarithromycin', 'klacid', 'azithromycin', 'zithromax'],
    crossWarning: 'Nguy cơ quá mẫn da và rối loạn dẫn truyền tim.'
  },
  {
    id: 'paracetamol',
    name: 'Nhóm Paracetamol / Acetaminophen',
    keywords: ['paracetamol', 'acetaminophen', 'panadol', 'efferalgan', 'hapacol', 'tylenol'],
    crossWarning: 'Tiền sử phản ứng quá mẫn với Paracetamol.'
  }
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;
  return keywords.some((kw) => {
    const normKw = normalizeText(kw);
    return norm.includes(normKw) || normKw.includes(norm);
  });
}

/**
 * Check drug-allergy conflict against patient's known allergies
 */
export function checkDrugAllergyConflicts(
  drugs: Array<{ drugName: string; activeIngredient?: string }>,
  patientAllergies?: string
): AllergyConflict[] {
  if (!patientAllergies || !patientAllergies.trim()) return [];
  const normAllergy = normalizeText(patientAllergies);
  if (normAllergy.includes('chua ghi nhan') || normAllergy.includes('khong co') || normAllergy.includes('khong ghi nhan')) {
    return [];
  }

  const conflicts: AllergyConflict[] = [];

  drugs.forEach((drug) => {
    const name = drug.drugName?.trim() || '';
    const ingr = drug.activeIngredient?.trim() || '';
    if (!name && !ingr) return;

    // 1. Group-based allergy checking (e.g. Penicillin allergy vs Augmentin prescription)
    for (const group of ALLERGY_GROUPS) {
      const patientHasGroupAllergy = matchesKeywords(normAllergy, group.keywords);
      if (patientHasGroupAllergy) {
        const drugMatchesGroup = matchesKeywords(name, group.keywords) || (ingr && matchesKeywords(ingr, group.keywords));
        if (drugMatchesGroup) {
          conflicts.push({
            drugName: name || ingr,
            activeIngredient: ingr,
            matchedAllergyKeyword: group.name,
            groupName: group.name,
            severity: 'CRITICAL',
            explanation: `Thuốc "${name || ingr}" thuộc ${group.name}, xung đột trực tiếp với tiền sử dị ứng đã ghi nhận của bệnh nhân. ${group.crossWarning}`
          });
          return;
        }
      }
    }

    // 2. Direct keyword substring check
    const allergyTokens = patientAllergies
      .split(/[,;.\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);

    for (const token of allergyTokens) {
      const normToken = normalizeText(token);
      if (normToken.length < 3) continue;
      const matchName = name && (normalizeText(name).includes(normToken) || normToken.includes(normalizeText(name)));
      const matchIngr = ingr && (normalizeText(ingr).includes(normToken) || normToken.includes(normalizeText(ingr)));
      if (matchName || matchIngr) {
        conflicts.push({
          drugName: name || ingr,
          activeIngredient: ingr,
          matchedAllergyKeyword: token,
          severity: 'CRITICAL',
          explanation: `Thuốc "${name || ingr}" trùng với tiền sử dị ứng: "${token}". Nguy cơ quá mẫn hoặc sốc phản vệ!`
        });
        return;
      }
    }
  });

  return conflicts;
}

/**
 * Check for Drug-Drug Interactions (DDI) across a list of prescribed medications
 */
export function checkDrugInteractions(
  drugs: Array<{ drugName: string; activeIngredient?: string }>
): DetectedInteraction[] {
  const validDrugs = drugs.filter((d) => (d.drugName && d.drugName.trim()) || (d.activeIngredient && d.activeIngredient.trim()));
  if (validDrugs.length < 2) return [];

  const detected: DetectedInteraction[] = [];
  const seenPairKeys = new Set<string>();

  for (let i = 0; i < validDrugs.length; i++) {
    for (let j = i + 1; j < validDrugs.length; j++) {
      const d1 = validDrugs[i];
      const d2 = validDrugs[j];

      const d1Text = `${d1.drugName} ${d1.activeIngredient || ''}`;
      const d2Text = `${d2.drugName} ${d2.activeIngredient || ''}`;

      for (const pair of KNOWN_INTERACTIONS) {
        const d1IsA = matchesKeywords(d1Text, pair.drugAKeywords);
        const d2IsB = matchesKeywords(d2Text, pair.drugBKeywords);
        const d1IsB = matchesKeywords(d1Text, pair.drugBKeywords);
        const d2IsA = matchesKeywords(d2Text, pair.drugAKeywords);

        if ((d1IsA && d2IsB) || (d1IsB && d2IsA)) {
          const pairKey = [pair.id, Math.min(i, j), Math.max(i, j)].join('-');
          if (!seenPairKeys.has(pairKey)) {
            seenPairKeys.add(pairKey);
            detected.push({
              pair,
              drug1: d1.drugName || d1.activeIngredient || 'Thuốc 1',
              drug2: d2.drugName || d2.activeIngredient || 'Thuốc 2',
              severity: pair.severity
            });
          }
        }
      }
    }
  }

  return detected;
}

/**
 * Comprehensive drug safety evaluation combining DDI and allergy conflict checks
 */
export function evaluatePrescriptionSafety(
  drugs: Array<{ drugName: string; activeIngredient?: string }>,
  patientAllergies?: string
): DrugSafetyCheckResult {
  const interactions = checkDrugInteractions(drugs);
  const allergyConflicts = checkDrugAllergyConflicts(drugs, patientAllergies);

  const hasCritical =
    interactions.some((i) => i.severity === 'CRITICAL') ||
    allergyConflicts.some((a) => a.severity === 'CRITICAL');

  const hasMajor =
    interactions.some((i) => i.severity === 'MAJOR') ||
    allergyConflicts.some((a) => a.severity === 'MAJOR');

  return {
    interactions,
    allergyConflicts,
    hasCritical,
    hasMajor,
    isSafe: interactions.length === 0 && allergyConflicts.length === 0
  };
}
