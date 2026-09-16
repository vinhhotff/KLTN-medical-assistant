package com.mediassist.dto;

import java.math.BigDecimal;

public class DoctorStatsDto {

    private long todayAppointmentsCount;
    private long todayWaitingCount;
    private long todayInProgressCount;
    private long todayCompletedCount;
    private long totalCompletedCount;
    private long totalAppointmentsCount;
    private BigDecimal todayRevenue;
    private BigDecimal lifetimeRevenue;
    private double doctorRating;
    private int totalConsultations;

    public DoctorStatsDto() {
        this.todayRevenue = BigDecimal.ZERO;
        this.lifetimeRevenue = BigDecimal.ZERO;
    }

    public DoctorStatsDto(long todayAppointmentsCount,
                          long todayWaitingCount,
                          long todayInProgressCount,
                          long todayCompletedCount,
                          long totalCompletedCount,
                          long totalAppointmentsCount,
                          BigDecimal todayRevenue,
                          BigDecimal lifetimeRevenue,
                          double doctorRating,
                          int totalConsultations) {
        this.todayAppointmentsCount = todayAppointmentsCount;
        this.todayWaitingCount = todayWaitingCount;
        this.todayInProgressCount = todayInProgressCount;
        this.todayCompletedCount = todayCompletedCount;
        this.totalCompletedCount = totalCompletedCount;
        this.totalAppointmentsCount = totalAppointmentsCount;
        this.todayRevenue = todayRevenue != null ? todayRevenue : BigDecimal.ZERO;
        this.lifetimeRevenue = lifetimeRevenue != null ? lifetimeRevenue : BigDecimal.ZERO;
        this.doctorRating = doctorRating;
        this.totalConsultations = totalConsultations;
    }

    public long getTodayAppointmentsCount() { return todayAppointmentsCount; }
    public void setTodayAppointmentsCount(long todayAppointmentsCount) { this.todayAppointmentsCount = todayAppointmentsCount; }

    public long getTodayWaitingCount() { return todayWaitingCount; }
    public void setTodayWaitingCount(long todayWaitingCount) { this.todayWaitingCount = todayWaitingCount; }

    public long getTodayInProgressCount() { return todayInProgressCount; }
    public void setTodayInProgressCount(long todayInProgressCount) { this.todayInProgressCount = todayInProgressCount; }

    public long getTodayCompletedCount() { return todayCompletedCount; }
    public void setTodayCompletedCount(long todayCompletedCount) { this.todayCompletedCount = todayCompletedCount; }

    public long getTotalCompletedCount() { return totalCompletedCount; }
    public void setTotalCompletedCount(long totalCompletedCount) { this.totalCompletedCount = totalCompletedCount; }

    public long getTotalAppointmentsCount() { return totalAppointmentsCount; }
    public void setTotalAppointmentsCount(long totalAppointmentsCount) { this.totalAppointmentsCount = totalAppointmentsCount; }

    public BigDecimal getTodayRevenue() { return todayRevenue; }
    public void setTodayRevenue(BigDecimal todayRevenue) { this.todayRevenue = todayRevenue; }

    public BigDecimal getLifetimeRevenue() { return lifetimeRevenue; }
    public void setLifetimeRevenue(BigDecimal lifetimeRevenue) { this.lifetimeRevenue = lifetimeRevenue; }

    public double getDoctorRating() { return doctorRating; }
    public void setDoctorRating(double doctorRating) { this.doctorRating = doctorRating; }

    public int getTotalConsultations() { return totalConsultations; }
    public void setTotalConsultations(int totalConsultations) { this.totalConsultations = totalConsultations; }
}
