package com.mediassist.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Payload đăng ký tài khoản bác sĩ độc lập (Bước 1 chỉ cần Nhóm 1: Định danh &amp; Tài khoản;
 * thông tin CCHN &amp; chuyên môn có thể hoàn thiện ở Bước 2 hoặc truyền kèm nếu có).
 */
public class DoctorRegisterRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, message = "Mật khẩu phải chứa ít nhất 8 ký tự")
    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String phone;

    private String avatarUrl;

    private String academicTitle = "BS";

    private String licenseNumber;

    private String licenseIssuedBy = "Bộ Y Tế";

    private String licenseDocumentUrl;

    private String hospitalAffiliation;

    private String department;

    @Min(value = 0, message = "Số năm kinh nghiệm không được âm")
    private Integer yearsOfExperience = 1;

    @PositiveOrZero(message = "Phí tư vấn không được âm")
    private BigDecimal consultationFee = BigDecimal.valueOf(300000);

    private List<String> specialtySlugs;

    private String bio;

    public DoctorRegisterRequest() {}

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getAcademicTitle() { return academicTitle; }
    public void setAcademicTitle(String academicTitle) { this.academicTitle = academicTitle; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getLicenseIssuedBy() { return licenseIssuedBy; }
    public void setLicenseIssuedBy(String licenseIssuedBy) { this.licenseIssuedBy = licenseIssuedBy; }

    public String getLicenseDocumentUrl() { return licenseDocumentUrl; }
    public void setLicenseDocumentUrl(String licenseDocumentUrl) { this.licenseDocumentUrl = licenseDocumentUrl; }

    public String getHospitalAffiliation() { return hospitalAffiliation; }
    public void setHospitalAffiliation(String hospitalAffiliation) { this.hospitalAffiliation = hospitalAffiliation; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public List<String> getSpecialtySlugs() { return specialtySlugs; }
    public void setSpecialtySlugs(List<String> specialtySlugs) { this.specialtySlugs = specialtySlugs; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
}
