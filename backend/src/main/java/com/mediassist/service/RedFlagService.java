package com.mediassist.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class RedFlagService {

    private static final Logger log = LoggerFactory.getLogger(RedFlagService.class);

    private record RedFlagRule(String name, List<String> patterns, String guidance) {}

    private final List<RedFlagRule> rules = List.of(
            new RedFlagRule(
                    "ACUTE_CORONARY_SYNDROME",
                    List.of(
                            "dau that nguc", "dau nguc du doi", "de nang long nguc", "dau tim",
                            "dau nguc lan tay trai", "dau nguc lan len cam", "ngung tim", "ep tim", "kho tho du doi"
                    ),
                    "CẢNH BÁO Y TẾ KHẨN CẤP: Dấu hiệu bạn mô tả có nguy cơ cao liên quan đến Hội chứng Mạch vành cấp hoặc Nhồi máu cơ tim. Vui lòng NGAY LẬP TỨC gọi Cấp cứu 115 hoặc đến phòng Cấp cứu bệnh viện gần nhất!"
            ),
            new RedFlagRule(
                    "ACUTE_STROKE_FAST",
                    List.of(
                            "meo mieng", "liet nua nguoi", "noi ngong", "dot quy",
                            "yeu tay chan dot ngot", "mat thi luc dot ngot", "te nua nguoi"
                    ),
                    "CẢNH BÁO ĐỘT QUỴ KHẨN CẤP (FAST): Triệu chứng méo miệng, liệt chi hoặc nói khó là dấu hiệu vàng của tai biến mạch máu não / đột quỵ. Mỗi phút đều quý giá. Hãy gọi ngay 115 để được cấp cứu trong khung giờ vàng!"
            ),
            new RedFlagRule(
                    "ANAPHYLAXIS",
                    List.of(
                            "soc phan ve", "phu moi mat", "nghet tho thanh quan",
                            "phu quincke", "kho tho sau uong thuoc", "kho tho sau an"
                    ),
                    "CẢNH BÁO SỐC PHẢN VỆ: Triệu chứng phù nề kèm tắc nghẽn đường thở là phản vệ cấp độ nguy kịch. Hãy gọi ngay 115 hoặc tiêm Adrenaline tự động nếu đã có chỉ định của bác sĩ!"
            ),
            new RedFlagRule(
                    "SEVERE_HEMORRHAGE_UNCONSCIOUS",
                    List.of(
                            "non ra mau", "ho ra mau du doi", "chay mau khong cam",
                            "bat tinh", "hon me", "co giat keo dai"
                    ),
                    "CẢNH BÁO NGUY KỊCH: Dấu hiệu xuất huyết ồ ạt hoặc mất tri giác cần can thiệp hồi sức cấp cứu trực tiếp ngay lập tức. Hãy gọi ngay 115!"
            )
    );

    /**
     * Scans patient input for emergency red flags.
     * Normalizes text (removes accents, lowercase) for robust zero-latency pattern matching.
     */
    public Optional<String> evaluateRedFlag(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }

        String normalized = stripAccents(text.toLowerCase());

        for (RedFlagRule rule : rules) {
            for (String pattern : rule.patterns()) {
                if (normalized.contains(pattern)) {
                    log.warn("🚨 RED-FLAG EMERGENCY DETECTED: [{}] triggered by keyword '{}'", rule.name(), pattern);
                    return Optional.of(rule.guidance());
                }
            }
        }

        return Optional.empty();
    }

    private static final Pattern DIACRITICS_PATTERN = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private String stripAccents(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        return DIACRITICS_PATTERN.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }
}
