package com.mediassist.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public class AdminCreateDoctorRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
    private String password;

    @NotBlank(message = "Họ và tên bác sĩ không được để trống")
    private String fullName;

    private String phone;

    private String academicTitle; // GS.TS, PGS.TS, TS.BS, ThS.BS, BS.CKII, BS.CKI

    private String hospitalAffiliation; // BV Chợ Rẫy, BV Đại học Y Dược...

    private String department; // Khoa Tim mạch...

    @NotBlank(message = "Số chứng chỉ hành nghề (CCHN) không được để trống")
    private String licenseNumber;

    private String licenseIssuedBy; // Bộ Y Tế / Sở Y Tế

    private BigDecimal consultationFee = BigDecimal.valueOf(300000);

    private Integer yearsOfExperience = 5;

    private List<String> specialtySlugs;

    private String bio;

    private boolean autoVerify = true;

    public AdminCreateDoctorRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAcademicTitle() { return academicTitle; }
    public void setAcademicTitle(String academicTitle) { this.academicTitle = academicTitle; }

    public String getHospitalAffiliation() { return hospitalAffiliation; }
    public void setHospitalAffiliation(String hospitalAffiliation) { this.hospitalAffiliation = hospitalAffiliation; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getLicenseIssuedBy() { return licenseIssuedBy; }
    public void setLicenseIssuedBy(String licenseIssuedBy) { this.licenseIssuedBy = licenseIssuedBy; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public List<String> getSpecialtySlugs() { return specialtySlugs; }
    public void setSpecialtySlugs(List<String> specialtySlugs) { this.specialtySlugs = specialtySlugs; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public boolean isAutoVerify() { return autoVerify; }
    public void setAutoVerify(boolean autoVerify) { this.autoVerify = autoVerify; }
}
