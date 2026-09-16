package com.mediassist.dto;

import java.util.List;
import java.util.Map;

public class AdminSystemStatsDto {

    // User Metrics
    private long totalUsers;
    private long totalPatients;
    private long totalDoctors;
    private long pendingDoctorsCount;
    private long suspendedUsersCount;

    // Telehealth Appointment Metrics
    private long totalAppointments;
    private long scheduledAppointmentsCount;
    private long completedAppointmentsCount;
    private long cancelledAppointmentsCount;

    // EMR & Document Scanner Metrics
    private long totalDocumentsAnalyzed;
    private long redFlagDocumentsCount;

    // AI Symptom Triage Metrics
    private long totalTriageSessions;
    private long emergencyTriageCount;
    private long routineTriageCount;

    // Component Infrastructure Health
    private Map<String, String> infrastructureHealth;

    // Recent System Activity Logs
    private List<AuditLogDto> recentActivities;

    public AdminSystemStatsDto() {}

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getTotalPatients() { return totalPatients; }
    public void setTotalPatients(long totalPatients) { this.totalPatients = totalPatients; }

    public long getTotalDoctors() { return totalDoctors; }
    public void setTotalDoctors(long totalDoctors) { this.totalDoctors = totalDoctors; }

    public long getPendingDoctorsCount() { return pendingDoctorsCount; }
    public void setPendingDoctorsCount(long pendingDoctorsCount) { this.pendingDoctorsCount = pendingDoctorsCount; }

    public long getSuspendedUsersCount() { return suspendedUsersCount; }
    public void setSuspendedUsersCount(long suspendedUsersCount) { this.suspendedUsersCount = suspendedUsersCount; }

    public long getTotalAppointments() { return totalAppointments; }
    public void setTotalAppointments(long totalAppointments) { this.totalAppointments = totalAppointments; }

    public long getScheduledAppointmentsCount() { return scheduledAppointmentsCount; }
    public void setScheduledAppointmentsCount(long scheduledAppointmentsCount) { this.scheduledAppointmentsCount = scheduledAppointmentsCount; }

    public long getCompletedAppointmentsCount() { return completedAppointmentsCount; }
    public void setCompletedAppointmentsCount(long completedAppointmentsCount) { this.completedAppointmentsCount = completedAppointmentsCount; }

    public long getCancelledAppointmentsCount() { return cancelledAppointmentsCount; }
    public void setCancelledAppointmentsCount(long cancelledAppointmentsCount) { this.cancelledAppointmentsCount = cancelledAppointmentsCount; }

    public long getTotalDocumentsAnalyzed() { return totalDocumentsAnalyzed; }
    public void setTotalDocumentsAnalyzed(long totalDocumentsAnalyzed) { this.totalDocumentsAnalyzed = totalDocumentsAnalyzed; }

    public long getRedFlagDocumentsCount() { return redFlagDocumentsCount; }
    public void setRedFlagDocumentsCount(long redFlagDocumentsCount) { this.redFlagDocumentsCount = redFlagDocumentsCount; }

    public long getTotalTriageSessions() { return totalTriageSessions; }
    public void setTotalTriageSessions(long totalTriageSessions) { this.totalTriageSessions = totalTriageSessions; }

    public long getEmergencyTriageCount() { return emergencyTriageCount; }
    public void setEmergencyTriageCount(long emergencyTriageCount) { this.emergencyTriageCount = emergencyTriageCount; }

    public long getRoutineTriageCount() { return routineTriageCount; }
    public void setRoutineTriageCount(long routineTriageCount) { this.routineTriageCount = routineTriageCount; }

    public Map<String, String> getInfrastructureHealth() { return infrastructureHealth; }
    public void setInfrastructureHealth(Map<String, String> infrastructureHealth) { this.infrastructureHealth = infrastructureHealth; }

    public List<AuditLogDto> getRecentActivities() { return recentActivities; }
    public void setRecentActivities(List<AuditLogDto> recentActivities) { this.recentActivities = recentActivities; }
}
