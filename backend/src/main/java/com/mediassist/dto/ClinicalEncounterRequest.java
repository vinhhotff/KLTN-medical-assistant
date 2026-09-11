package com.mediassist.dto;

import java.time.LocalDate;

public class ClinicalEncounterRequest {
    private String chiefComplaint;
    private String vitalSignsJson;
    private String icd10Code;
    private String icd10Name;
    private String prescriptionJson;
    private String treatmentPlan;
    private String consultationNotes;
    private LocalDate followUpDate;
    private String clinicRoom;

    public ClinicalEncounterRequest() {}

    public String getChiefComplaint() { return chiefComplaint; }
    public void setChiefComplaint(String chiefComplaint) { this.chiefComplaint = chiefComplaint; }

    public String getVitalSignsJson() { return vitalSignsJson; }
    public void setVitalSignsJson(String vitalSignsJson) { this.vitalSignsJson = vitalSignsJson; }

    public String getIcd10Code() { return icd10Code; }
    public void setIcd10Code(String icd10Code) { this.icd10Code = icd10Code; }

    public String getIcd10Name() { return icd10Name; }
    public void setIcd10Name(String icd10Name) { this.icd10Name = icd10Name; }

    public String getPrescriptionJson() { return prescriptionJson; }
    public void setPrescriptionJson(String prescriptionJson) { this.prescriptionJson = prescriptionJson; }

    public String getTreatmentPlan() { return treatmentPlan; }
    public void setTreatmentPlan(String treatmentPlan) { this.treatmentPlan = treatmentPlan; }

    public String getConsultationNotes() { return consultationNotes; }
    public void setConsultationNotes(String consultationNotes) { this.consultationNotes = consultationNotes; }

    public LocalDate getFollowUpDate() { return followUpDate; }
    public void setFollowUpDate(LocalDate followUpDate) { this.followUpDate = followUpDate; }

    public String getClinicRoom() { return clinicRoom; }
    public void setClinicRoom(String clinicRoom) { this.clinicRoom = clinicRoom; }
}
