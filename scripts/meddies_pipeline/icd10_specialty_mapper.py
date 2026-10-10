"""
ICD-10 to MediAssist-AI Medical Specialty Mapper.
Maps ICD-10 clinical codes and Vietnamese medical conditions from the Meddies dataset
to the canonical 12 Medical Specialties defined in MediAssist-AI PostgreSQL database.
"""

import re
from typing import Dict, List, Optional, Tuple

# Mapping table from ICD-10 Chapters & Prefix Codes to MediAssist-AI Specialties
ICD10_PREFIX_TO_SPECIALTY: List[Tuple[re.Pattern, str, str]] = [
    # 1. Cardiology (Tim mạch) - I00-I52, I70-I99
    (re.compile(r"^(I0[0-9]|I1[0-5]|I2[0-5]|I3[0-9]|I4[0-9]|I5[0-2]|I7[0-9]|I8[0-9]|I9[0-9])", re.I),
     "cardiology", "Cardiology (Tim mạch)"),

    # 2. Neurology (Thần kinh) - G00-G99, I60-I69 (Đột quỵ não)
    (re.compile(r"^(G[0-9]{2}|I6[0-9]|H81)", re.I),
     "neurology", "Neurology (Thần kinh)"),

    # 3. Pulmonology (Hô hấp & Phổi) - J10-J98 (excluding upper airway J00-J06)
    (re.compile(r"^(J1[0-8]|J2[0-2]|J4[0-7]|J6[0-9]|J7[0-9]|J8[0-6]|J9[0-8])", re.I),
     "pulmonology", "Pulmonology (Hô hấp & Phổi)"),

    # 4. Otolaryngology (Tai Mũi Họng) - H60-H95, J00-J06, J30-J39
    (re.compile(r"^(H6[0-9]|H7[0-5]|H8[0-3]|H9[0-5]|J0[0-6]|J3[0-9])", re.I),
     "ent", "Otolaryngology (Tai Mũi Họng)"),

    # 5. Gastroenterology (Tiêu hóa - Gan mật) - K20-K93
    (re.compile(r"^(K2[0-9]|K3[0-8]|K4[0-6]|K5[0-9]|K6[0-7]|K7[0-7]|K8[0-7]|K9[0-3])", re.I),
     "gastroenterology", "Gastroenterology (Tiêu hóa - Gan mật)"),

    # 6. Endocrinology (Nội tiết & Đái tháo đường) - E00-E35, E65-E89
    (re.compile(r"^(E0[0-7]|E1[0-4]|E2[0-9]|E3[0-5]|E6[5-8]|E7[0-9]|E8[0-9])", re.I),
     "endocrinology", "Endocrinology (Nội tiết & Đái tháo đường)"),

    # 7. Dermatology (Da liễu) - L00-L99
    (re.compile(r"^L[0-9]{2}", re.I),
     "dermatology", "Dermatology (Da liễu)"),

    # 8. Orthopedics (Cơ Xương Khớp) - M00-M99
    (re.compile(r"^M[0-9]{2}", re.I),
     "orthopedics", "Orthopedics (Cơ Xương Khớp)"),

    # 9. Nephrology (Thận & Tiết niệu) - N00-N39
    (re.compile(r"^(N0[0-8]|N1[0-9]|N2[0-8]|N3[0-9])", re.I),
     "nephrology", "Nephrology (Thận & Tiết niệu)"),

    # 10. Obstetrics & Gynecology (Sản Phụ Khoa) - O00-O99, N70-N98
    (re.compile(r"^(O[0-9]{2}|N7[0-7]|N8[0-9]|N9[0-8])", re.I),
     "obstetrics-gynecology", "Obstetrics & Gynecology (Sản Phụ Khoa)"),

    # 11. Pediatrics (Nhi khoa) - P00-P96 (Sơ sinh)
    (re.compile(r"^P[0-9]{2}", re.I),
     "pediatrics", "Pediatrics (Nhi khoa)"),
]

# Vietnamese condition keywords mapped to specialties for fallback semantic matching
CONDITION_KEYWORDS_MAP: List[Tuple[List[str], str, str]] = [
    (["tim mạch", "tăng huyết áp", "huyết áp cao", "suy tim", "đau thắt ngực", "mạch vành", "rối loạn nhịp tim"],
     "cardiology", "Cardiology (Tim mạch)"),
    (["hô hấp", "hen suyễn", "hen phế quản", "phổi tắc nghẽn", "copd", "viêm phổi", "viêm phế quản"],
     "pulmonology", "Pulmonology (Hô hấp & Phổi)"),
    (["dạ dày", "tiêu hóa", "đại tràng", "trào ngược", "gerd", "gan", "xơ gan", "men gan", "túi mật", "thượng vị"],
     "gastroenterology", "Gastroenterology (Tiêu hóa - Gan mật)"),
    (["da liễu", "viêm da", "chàm", "vảy nến", "mụn", "mề đay", "dị ứng da", "ngứa da"],
     "dermatology", "Dermatology (Da liễu)"),
    (["xương khớp", "thoái hóa khớp", "thoát vị đĩa đệm", "cột sống", "viêm khớp", "gút", "gout", "đau lưng", "khớp gối"],
     "orthopedics", "Orthopedics (Cơ Xương Khớp)"),
    (["thận", "suy thận", "sỏi thận", "tiết niệu", "tiểu buốt", "chạy thận", "lọc máu"],
     "nephrology", "Nephrology (Thận & Tiết niệu)"),
    (["tiểu đường", "đái tháo đường", "nội tiết", "tuyến giáp", "bướu cổ", "basedow", "mỡ máu"],
     "endocrinology", "Endocrinology (Nội tiết & Đái tháo đường)"),
    (["thần kinh", "tai biến", "đột quỵ", "đau đầu", "migraine", "tiền đình", "chóng mặt", "mất ngủ", "parkinson"],
     "neurology", "Neurology (Thần kinh)"),
    (["tai mũi họng", "viêm xoang", "viêm mũi", "viêm amidan", "viêm họng", "ù tai", "viêm tai"],
     "ent", "Otolaryngology (Tai Mũi Họng)"),
    (["phụ khoa", "kinh nguyệt", "mang thai", "thai kỳ", "u xơ tử cung", "buồng trứng"],
     "obstetrics-gynecology", "Obstetrics & Gynecology (Sản Phụ Khoa)"),
    (["trẻ em", "nhi", "sơ sinh", "sốt phát ban trẻ em"],
     "pediatrics", "Pediatrics (Nhi khoa)")
]


def extract_icd10_code(text: str) -> Optional[str]:
    """Extracts ICD-10 code (e.g. 'E11', 'K25', 'I10', 'J45') from raw condition text."""
    if not text:
        return None
    match = re.search(r"\b([A-Z][0-9]{2}(?:\.[0-9]+)?)\b", text.strip(), re.I)
    if match:
        return match.group(1).upper()
    return None


def map_condition_to_specialty(condition_text: str, age: Optional[int] = None) -> Tuple[str, str]:
    """
    Maps an ICD-10 code or Vietnamese condition string to (specialty_slug, specialty_name).
    If patient age <= 15, prioritizes Pediatrics (Nhi khoa).
    """
    if age is not None and age <= 15:
        return ("pediatrics", "Pediatrics (Nhi khoa)")

    icd_code = extract_icd10_code(condition_text)
    if icd_code:
        for pattern, slug, name in ICD10_PREFIX_TO_SPECIALTY:
            if pattern.search(icd_code):
                return (slug, name)

    # Fallback keyword matching on Vietnamese disease name
    cond_lower = condition_text.lower()
    for keywords, slug, name in CONDITION_KEYWORDS_MAP:
        for kw in keywords:
            if kw in cond_lower:
                return (slug, name)

    return ("general-internal-medicine", "General Internal Medicine (Nội tổng quát)")


def resolve_primary_specialty(chronic_conditions: List[str], age: Optional[int] = None) -> Tuple[str, str]:
    """
    Given a list of patient chronic conditions (from Meddies medical_history),
    resolves the primary clinical specialty.
    """
    if not chronic_conditions:
        if age is not None and age <= 15:
            return ("pediatrics", "Pediatrics (Nhi khoa)")
        return ("general-internal-medicine", "General Internal Medicine (Nội tổng quát)")

    for cond in chronic_conditions:
        slug, name = map_condition_to_specialty(str(cond), age=age)
        if slug != "general-internal-medicine":
            return (slug, name)

    return ("general-internal-medicine", "General Internal Medicine (Nội tổng quát)")
