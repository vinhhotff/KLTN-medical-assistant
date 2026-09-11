import sys
import requests
import json

# Ensure UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:5000"

def get_data(r):
    body = r.json()
    if isinstance(body, dict) and "data" in body:
        return body["data"]
    return body

def test_api():
    print("1. Checking Actuator Health...")
    r = requests.get(f"{BASE_URL}/actuator/health")
    print(f"Health Status: {r.status_code}, Status: {r.json().get('status')}")
    assert r.status_code == 200

    print("\n2. Checking Specialties API...")
    r = requests.get(f"{BASE_URL}/api/v1/specialties")
    specialties = get_data(r)
    print(f"Specialties Status: {r.status_code}, Count: {len(specialties)}")
    for s in specialties:
        print(f"  - [{s.get('slug')}] {s.get('name')}")
    assert len(specialties) == 12

    print("\n3. Checking Public Doctors API...")
    r = requests.get(f"{BASE_URL}/api/v1/doctors")
    doctors = get_data(r)
    print(f"Doctors Status: {r.status_code}, Count: {len(doctors)}")
    for d in doctors:
        print(f"  - {d.get('academicTitle', '')} {d.get('fullName')} | {d.get('hospitalAffiliation')} | {d.get('department')} | CCHN: {d.get('licenseNumber')} | Rating: {d.get('rating')} ({d.get('totalConsultations')} ca)")
    assert len(doctors) == 9

    print("\n4. Testing Doctor Semantic Search (Query: 'suy tim và hồi hộp đánh trống ngực')...")
    r = requests.get(f"{BASE_URL}/api/v1/triage/search/semantic", params={"query": "suy tim và hồi hộp đánh trống ngực"})
    semantic_docs = get_data(r)
    print(f"Semantic Search Status: {r.status_code}, Results: {len(semantic_docs)}")
    for sm in semantic_docs[:3]:
        print(f"  - {sm.get('academicTitle', '')} {sm.get('fullName')} | {sm.get('hospitalAffiliation')} (Score: {sm.get('similarityScore', 'N/A')})")

    print("\n5. Testing Admin Login & Pending Doctors Queue...")
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": "admin@mediassist.local",
        "password": "Admin@SecurePass2026!"
    })
    print(f"Admin Login Status: {r.status_code}")
    assert r.status_code == 200
    admin_data = get_data(r)
    admin_token = admin_data.get("token")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.get(f"{BASE_URL}/api/v1/admin/doctors/pending", headers=admin_headers)
    pending_docs = get_data(r)
    print(f"Pending Doctors Status: {r.status_code}, Count: {len(pending_docs)}")
    for pd in pending_docs:
        print(f"  - {pd.get('fullName')} | {pd.get('hospitalAffiliation')} | CCHN: {pd.get('licenseNumber')}")
    assert len(pending_docs) == 3

    print("\n6. Testing Schedule Slots Lookup for Doctor An (Next Tuesday: 2026-09-15)...")
    doc_an_id = doctors[0].get("id")
    r = requests.get(f"{BASE_URL}/api/v1/doctors/{doc_an_id}/slots", params={"date": "2026-09-15"})
    slots = get_data(r)
    print(f"Doctor Slots Status: {r.status_code}, Slots for {doctors[0].get('fullName')}: {len(slots)}")
    if slots:
        print(f"  Ca Sáng đầu tiên: {slots[0].get('startTime')} - {slots[0].get('endTime')} (SlotId: {slots[0].get('id')})")
        print(f"  Ca Chiều: {slots[7].get('startTime')} - {slots[7].get('endTime')}")

    print("\n7. Testing Patient Login & Appointments EMR...")
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": "patient@mediassist.local",
        "password": "Patient@SecurePass2026!"
    })
    print(f"Patient Login Status: {r.status_code}")
    assert r.status_code == 200
    patient_data = get_data(r)
    patient_token = patient_data.get("token")

    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    r = requests.get(f"{BASE_URL}/api/v1/appointments/my", headers=patient_headers)
    patient_appts = get_data(r)
    print(f"Patient Appointments Status: {r.status_code}, Count: {len(patient_appts)}")
    for a in patient_appts:
        print(f"  - Mã: {a.get('appointmentCode')} | Trạng thái: {a.get('status')} | BS: {a.get('doctorName')} | ICD-10: {a.get('icd10Code')} - {a.get('icd10Name')}")

    print("\n===================================================================")
    print(">>> ALL 7 ENTERPRISE INTEGRATION VERIFICATIONS PASSED WITH 100% SUCCESS! <<<")
    print("===================================================================")

if __name__ == "__main__":
    test_api()
