package com.mediassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Service to dynamically fetch random patient personas from Meddies/meddies-persona-vie
 * and format them into authentic hospital medical lab report PDFs using Apache PDFBox 3.0.4.
 */
@Service
public class MeddiesPdfGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(MeddiesPdfGeneratorService.class);
    private static final String MEDDIES_API_URL = "https://datasets-server.huggingface.co/rows?dataset=Meddies%2Fmeddies-persona-vie&config=default&split=train&limit=1&offset=";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    public static class GeneratedPdfResult {
        private final String fileName;
        private final String patientName;
        private final byte[] pdfBytes;

        public GeneratedPdfResult(String fileName, String patientName, byte[] pdfBytes) {
            this.fileName = fileName;
            this.patientName = patientName;
            this.pdfBytes = pdfBytes;
        }

        public String getFileName() {
            return fileName;
        }

        public String getPatientName() {
            return patientName;
        }

        public byte[] getPdfBytes() {
            return pdfBytes;
        }
    }

    public static class IndicatorRow {
        public final String name;
        public final String value;
        public final String unit;
        public final String refRange;
        public final String status;

        public IndicatorRow(String name, String value, String unit, String refRange, String status) {
            this.name = name;
            this.value = value;
            this.unit = unit;
            this.refRange = refRange;
            this.status = status;
        }
    }

    public static class PatientModel {
        public String fullName;
        public int age;
        public String gender;
        public String province;
        public String district;
        public String cccd;
        public String bhyt;
        public String patientCode;
        public String chiefComplaint;
        public String history;
        public String hospitalName;
        public String department;
        public String doctorName;
        public List<IndicatorRow> indicators = new ArrayList<>();
    }

    /**
     * Generates a random medical report PDF by pulling from Hugging Face or the internal resilient pool.
     */
    public GeneratedPdfResult generateRandomMeddiesPdf() {
        PatientModel patient = fetchRandomPersonaFromHuggingFace();
        if (patient == null) {
            patient = pickFallbackPersona();
        }

        byte[] pdfBytes = renderPdf(patient);
        String safeName = stripAccents(patient.fullName).replaceAll("[^a-zA-Z0-9]+", "_");
        String fileName = "Phieu_Xet_Nghiem_" + safeName + ".pdf";

        log.info("📄 [MEDDIES PDF GENERATED] Successfully generated sample PDF: {} ({} bytes) for patient: {}",
                fileName, pdfBytes.length, patient.fullName);

        return new GeneratedPdfResult(fileName, patient.fullName, pdfBytes);
    }

    /**
     * Attempts to query a random record from the Meddies Persona VIE Hugging Face dataset.
     */
    private PatientModel fetchRandomPersonaFromHuggingFace() {
        try {
            int offset = ThreadLocalRandom.current().nextInt(0, 1000);
            String url = MEDDIES_API_URL + offset;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .header("User-Agent", "MediAssist-AI/1.0")
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                JsonNode rows = root.path("rows");
                if (rows.isArray() && !rows.isEmpty()) {
                    JsonNode row = rows.get(0).path("row");
                    JsonNode demo = row.path("demographics");
                    JsonNode llm = row.path("llm_fields");
                    JsonNode med = row.path("medical_history");

                    PatientModel p = new PatientModel();
                    p.fullName = demo.path("full_name").asText("Nguyen Van An");
                    p.age = demo.path("age").asInt(45);
                    p.gender = demo.path("gender").asText("Nam");
                    p.province = demo.path("province").asText("Ha Noi");
                    p.district = demo.path("district").asText("Dong Da");
                    p.chiefComplaint = llm.path("chief_complaint").asText("Kham tong quat va xet nghiem dinh ky");
                    p.history = llm.path("history_of_present_illness").asText("");

                    populateClinicalMetadata(p, med);
                    return p;
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Meddies API request interrupted (falling back to resilient persona pool): {}", e.getMessage());
        } catch (Exception e) {
            log.warn("Could not query HuggingFace Meddies API (falling back to resilient persona pool): {}", e.getMessage());
        }
        return null;
    }

    private void populateClinicalMetadata(PatientModel p, JsonNode medHistory) {
        if (medHistory != null && (p.history == null || p.history.isBlank())) {
            JsonNode chronic = medHistory.path("chronic_conditions");
            if (chronic.isArray() && !chronic.isEmpty()) {
                p.history = "Tien su benh: " + chronic.get(0).asText("");
            }
        }
        p.cccd = String.format("0%02d%09d",
                ThreadLocalRandom.current().nextInt(1, 99),
                ThreadLocalRandom.current().nextInt(100000000, 999999999));
        p.bhyt = String.format("DN4%02d%010d",
                ThreadLocalRandom.current().nextInt(10, 99),
                ThreadLocalRandom.current().nextLong(1000000000L, 9999999999L));
        p.patientCode = "BN" + LocalDate.now().getYear() % 100 + String.format("%05d", ThreadLocalRandom.current().nextInt(1000, 99999));

        String[] hospitals = {
                "BENH VIEN BACH MAI",
                "BENH VIEN CHO RAY",
                "BENH VIEN DAI HOC Y DUOC TP.HCM",
                "BENH VIEN DA KHOA TRUNG UONG",
                "BENH VIEN THONG NHAT"
        };
        p.hospitalName = hospitals[ThreadLocalRandom.current().nextInt(hospitals.length)];

        String[] doctors = {
                "TS.BS Nguyen Van An",
                "PGS.TS Vu Dinh Hung",
                "BS.CKII Tran Thi Mai",
                "BS.CKI Le Van Cuong",
                "ThS.BS Pham Quoc Thang"
        };
        p.doctorName = doctors[ThreadLocalRandom.current().nextInt(doctors.length)];

        String complaintLower = (p.chiefComplaint + " " + p.history).toLowerCase();
        if (complaintLower.contains("nguc") || complaintLower.contains("tim") || complaintLower.contains("mach")) {
            p.department = "Khoa Noi Tim Mach";
            p.indicators.add(new IndicatorRow("Cholesterol toan phan", "6.8", "mmol/L", "3.9 - 5.2", "TANG"));
            p.indicators.add(new IndicatorRow("Triglyceride", "2.9", "mmol/L", "0.46 - 1.88", "TANG"));
            p.indicators.add(new IndicatorRow("Troponin T hs", "0.045", "ng/mL", "< 0.014", "TANG CAO"));
            p.indicators.add(new IndicatorRow("Glucose huyet doi", "5.8", "mmol/L", "3.9 - 6.4", "BINH THUONG"));
            p.indicators.add(new IndicatorRow("Creatinine", "85.0", "umol/L", "44.0 - 88.0", "BINH THUONG"));
        } else if (complaintLower.contains("gan") || complaintLower.contains("bung") || complaintLower.contains("vang da") || complaintLower.contains("ruou")) {
            p.department = "Khoa Noi Tieu Hoa - Gan Mat";
            p.indicators.add(new IndicatorRow("Men gan ALT (GPT)", "95.0", "U/L", "< 41.0", "TANG CAO"));
            p.indicators.add(new IndicatorRow("Men gan AST (GOT)", "88.0", "U/L", "< 37.0", "TANG CAO"));
            p.indicators.add(new IndicatorRow("GGT", "145.0", "U/L", "11.0 - 50.0", "TANG CAO"));
            p.indicators.add(new IndicatorRow("Bilirubin toan phan", "22.5", "umol/L", "5.1 - 17.0", "TANG"));
            p.indicators.add(new IndicatorRow("Albumin", "38.0", "g/L", "35.0 - 52.0", "BINH THUONG"));
        } else if (complaintLower.contains("duong") || complaintLower.contains("tieu") || complaintLower.contains("khat")) {
            p.department = "Khoa Noi Tiet - Dai Thao Duong";
            p.indicators.add(new IndicatorRow("Glucose huyet doi", "9.6", "mmol/L", "3.9 - 6.4", "TANG CAO"));
            p.indicators.add(new IndicatorRow("HbA1c", "8.7", "%", "4.0 - 6.0", "TANG CAO"));
            p.indicators.add(new IndicatorRow("Ure", "7.4", "mmol/L", "2.5 - 7.5", "BINH THUONG"));
            p.indicators.add(new IndicatorRow("Creatinine", "82.0", "umol/L", "44.0 - 88.0", "BINH THUONG"));
            p.indicators.add(new IndicatorRow("Acid Uric", "340.0", "umol/L", "200.0 - 420.0", "BINH THUONG"));
        } else if (complaintLower.contains("than") || complaintLower.contains("phu") || complaintLower.contains("tieu dem")) {
            p.department = "Khoa Noi Than - Tiet Nieu";
            p.indicators.add(new IndicatorRow("Creatinine", "175.0", "umol/L", "44.0 - 88.0", "TANG CAO"));
            p.indicators.add(new IndicatorRow("Ure", "15.2", "mmol/L", "2.5 - 7.5", "TANG CAO"));
            p.indicators.add(new IndicatorRow("eGFR", "36.0", "mL/min", "> 90.0", "GIAM NANG"));
            p.indicators.add(new IndicatorRow("Acid Uric", "495.0", "umol/L", "200.0 - 420.0", "TANG"));
            p.indicators.add(new IndicatorRow("Kali mau (K+)", "5.1", "mmol/L", "3.5 - 5.0", "TANG NHE"));
        } else {
            p.department = "Khoa Xet Nghiem Tong Quat";
            p.indicators.add(new IndicatorRow("Bach cau (WBC)", "13.8", "G/L", "4.0 - 10.0", "TANG"));
            p.indicators.add(new IndicatorRow("Neutrophil (%)", "78.5", "%", "40.0 - 70.0", "TANG"));
            p.indicators.add(new IndicatorRow("Protein C phan ung (CRP)", "24.5", "mg/L", "< 5.0", "TANG CAO"));
            p.indicators.add(new IndicatorRow("Hong cau (RBC)", "4.6", "T/L", "3.8 - 5.3", "BINH THUONG"));
            p.indicators.add(new IndicatorRow("Tieu cau (PLT)", "240.0", "G/L", "150.0 - 450.0", "BINH THUONG"));
        }
    }

    private PatientModel pickFallbackPersona() {
        PatientModel[] pool = new PatientModel[5];

        // 1. Tim mach
        PatientModel p1 = new PatientModel();
        p1.fullName = "Nguyen Van Binh";
        p1.age = 58;
        p1.gender = "Nam";
        p1.province = "Ha Noi";
        p1.district = "Hai Ba Trung";
        p1.chiefComplaint = "Dau that nguc trai khi len cau thang, hoi hop danh trong nguc";
        p1.history = "Tien su tang huyet ap va roi loan lipid mau 3 nam. Khoang 1 tuan nay xuat hien con dau tuc nguc trai...";
        populateClinicalMetadata(p1, null);
        pool[0] = p1;

        // 2. Gan mat
        PatientModel p2 = new PatientModel();
        p2.fullName = "Tran Van Tuan";
        p2.age = 45;
        p2.gender = "Nam";
        p2.province = "TP.HCM";
        p2.district = "Quan 5";
        p2.chiefComplaint = "Met moi, chieu an khong ngon, dau am i ha suon phai";
        p2.history = "Uong bia ruou thuong xuyen. Men gan tang cao trong lan kham suc khoe dinh ky...";
        populateClinicalMetadata(p2, null);
        pool[1] = p2;

        // 3. Dai thao duong
        PatientModel p3 = new PatientModel();
        p3.fullName = "Le Thi Lan";
        p3.age = 52;
        p3.gender = "Nu";
        p3.province = "Da Nang";
        p3.district = "Hai Chau";
        p3.chiefComplaint = "Uong nhieu, tieu nhieu, sut 3kg trong 1 thang";
        p3.history = "Phat hien duong huyet luc doi cao 9.6 mmol/L, mat nhin mo nhe...";
        populateClinicalMetadata(p3, null);
        pool[2] = p3;

        // 4. Than - Tiet nieu
        PatientModel p4 = new PatientModel();
        p4.fullName = "Pham Quoc Dung";
        p4.age = 64;
        p4.gender = "Nam";
        p4.province = "Can Tho";
        p4.district = "Ninh Kieu";
        p4.chiefComplaint = "Phu hai chi duoi vao buoi sang, tieu dem 3-4 lan";
        p4.history = "Tien su tang huyet ap lau nam. Xet nghiem thay Creatinine tang cao, eGFR suy giam...";
        populateClinicalMetadata(p4, null);
        pool[3] = p4;

        // 5. Nhiem trung - Sot
        PatientModel p5 = new PatientModel();
        p5.fullName = "Hoang Thu Trang";
        p5.age = 29;
        p5.gender = "Nu";
        p5.province = "Hai Phong";
        p5.district = "Le Chan";
        p5.chiefComplaint = "Sot cao 39 do C kem ho khan, dau nhuc co toan than";
        p5.history = "Sot lien tuc 3 ngay nay, da uong ha sot Paracetamol nhung con sot tai phat...";
        populateClinicalMetadata(p5, null);
        pool[4] = p5;

        int index = ThreadLocalRandom.current().nextInt(pool.length);
        return pool[index];
    }

    /**
     * Renders a standardized hospital clinical lab report into PDF bytes using Apache PDFBox 3.0.4.
     */
    private byte[] renderPdf(PatientModel p) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font fontOblique = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                float y = 780;
                float margin = 45;

                // 1. Hospital Header
                cs.beginText();
                cs.setFont(fontBold, 15);
                cs.newLineAtOffset(margin, y);
                cs.showText(stripAccents(p.hospitalName));
                cs.endText();

                y -= 16;
                cs.beginText();
                cs.setFont(fontRegular, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText(stripAccents(p.department + " - PHONG XET NGHIEM SINH HOA & HUYET HOC"));
                cs.endText();

                // Decorative Line
                y -= 8;
                cs.setLineWidth(1.5f);
                cs.moveTo(margin, y);
                cs.lineTo(PDRectangle.A4.getWidth() - margin, y);
                cs.stroke();

                // 2. Title
                y -= 26;
                cs.beginText();
                cs.setFont(fontBold, 14);
                cs.newLineAtOffset(160, y);
                cs.showText("KET QUA XET NGHIEM Y KHOA");
                cs.endText();

                y -= 12;
                cs.beginText();
                cs.setFont(fontOblique, 9);
                cs.newLineAtOffset(180, y);
                cs.showText("(Trich xuat he thong Benh an Dien tu EMR / HIS)");
                cs.endText();

                // 3. Patient Demographics & Administrative Information
                y -= 22;
                cs.beginText();
                cs.setFont(fontBold, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("THONG TIN BENH NHAN (PATIENT PROFILE):");
                cs.endText();

                y -= 15;
                drawText(cs, fontRegular, 9, margin, y, "Ho va ten: " + stripAccents(p.fullName));
                drawText(cs, fontRegular, 9, 280, y, "Tuoi: " + p.age + "  -  Gioi tinh: " + stripAccents(p.gender));
                drawText(cs, fontRegular, 9, 420, y, "Ma BN: " + p.patientCode);

                y -= 14;
                drawText(cs, fontRegular, 9, margin, y, "So CCCD: " + p.cccd);
                drawText(cs, fontRegular, 9, 280, y, "The BHYT: " + p.bhyt);
                drawText(cs, fontRegular, 9, 420, y, "SID: " + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

                y -= 14;
                drawText(cs, fontRegular, 9, margin, y, "Dia chi: " + stripAccents(p.district + ", " + p.province));
                drawText(cs, fontRegular, 9, 280, y, "Bac si chi dinh: " + stripAccents(p.doctorName));
                drawText(cs, fontRegular, 9, 420, y, "Ngay xet nghiem: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

                y -= 14;
                String complaint = stripAccents(p.chiefComplaint);
                if (complaint.length() > 75) complaint = complaint.substring(0, 75) + "...";
                drawText(cs, fontRegular, 9, margin, y, "Ly do kham: " + complaint);

                // Divider line
                y -= 10;
                cs.setLineWidth(0.5f);
                cs.moveTo(margin, y);
                cs.lineTo(PDRectangle.A4.getWidth() - margin, y);
                cs.stroke();

                // 4. Lab Indicators Table
                y -= 18;
                cs.beginText();
                cs.setFont(fontBold, 10);
                cs.newLineAtOffset(margin, y);
                cs.showText("BANG CHI SO CAN LAM SANG (LABORATORY INDICATORS):");
                cs.endText();

                y -= 16;
                // Table Header
                cs.beginText();
                cs.setFont(fontBold, 9);
                cs.newLineAtOffset(margin, y);
                cs.showText("TEN CHI SO");
                cs.newLineAtOffset(170, 0);
                cs.showText("KET QUA");
                cs.newLineAtOffset(80, 0);
                cs.showText("DON VI");
                cs.newLineAtOffset(80, 0);
                cs.showText("THAM CHIEU");
                cs.newLineAtOffset(100, 0);
                cs.showText("DANH GIA");
                cs.endText();

                y -= 5;
                cs.setLineWidth(0.8f);
                cs.moveTo(margin, y);
                cs.lineTo(PDRectangle.A4.getWidth() - margin, y);
                cs.stroke();

                // Table Rows
                if (p.indicators != null) {
                    int maxRows = Math.min(p.indicators.size(), 10);
                    for (int i = 0; i < maxRows; i++) {
                        IndicatorRow row = p.indicators.get(i);
                        if (row == null) continue;
                        y -= 16;
                        drawText(cs, fontRegular, 9, margin, y, row.name);
                        drawText(cs, fontBold, 9, margin + 170, y, row.value);
                        drawText(cs, fontRegular, 9, margin + 250, y, row.unit);
                        drawText(cs, fontRegular, 9, margin + 330, y, row.refRange);

                        if ("TANG".equals(row.status) || "TANG CAO".equals(row.status)) {
                            drawText(cs, fontBold, 9, margin + 430, y, "[!] " + row.status);
                        } else if ("GIAM".equals(row.status) || "GIAM NANG".equals(row.status)) {
                            drawText(cs, fontBold, 9, margin + 430, y, "[v] " + row.status);
                        } else {
                            drawText(cs, fontRegular, 9, margin + 430, y, row.status);
                        }
                    }
                }

                // Table Bottom Border
                y -= 8;
                cs.setLineWidth(0.5f);
                cs.moveTo(margin, y);
                cs.lineTo(PDRectangle.A4.getWidth() - margin, y);
                cs.stroke();

                // 5. Clinical Summary & Recommendations
                y -= 22;
                drawText(cs, fontBold, 9, margin, y, "GHI CHU LAM SANG:");
                y -= 13;
                drawText(cs, fontRegular, 8.5f, margin, y, "- Cac chi so bat thuong can duoc doi chieu voi trieu chung lam sang boi Bac si chuyen khoa.");
                y -= 12;
                drawText(cs, fontRegular, 8.5f, margin, y, "- De nghi benh nhan giu gin phieu ket qua de tai kham hoac tham van Telehealth truc tuyen.");

                // 6. Signature Area
                y -= 45;
                drawText(cs, fontRegular, 8.5f, margin + 340, y, "Ngay " + LocalDate.now().getDayOfMonth() + " thang " + LocalDate.now().getMonthValue() + " nam " + LocalDate.now().getYear());
                y -= 12;
                drawText(cs, fontBold, 9, margin + 355, y, "TRUONG KHOA XET NGHIEM");
                y -= 35;
                drawText(cs, fontBold, 9, margin + 365, y, p.doctorName);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        } catch (IOException | IllegalArgumentException e) {
            log.error("Failed to render PDF using PDFBox: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi sinh tệp PDF: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error during PDF generation: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi sinh tệp PDF: " + e.getMessage(), e);
        }
    }

    private void drawText(PDPageContentStream cs, PDType1Font font, float fontSize, float x, float y, String text) throws IOException {
        String safeText = stripAccents(text);
        cs.beginText();
        cs.setFont(font, fontSize);
        cs.newLineAtOffset(x, y);
        cs.showText(safeText);
        cs.endText();
    }

    private String stripAccents(String s) {
        if (s == null) return "";
        String normalized = Normalizer.normalize(s, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('Đ', 'D')
                .replace('đ', 'd')
                .replaceAll("[^\\x20-\\x7E]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
