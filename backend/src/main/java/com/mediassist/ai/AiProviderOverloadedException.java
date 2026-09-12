package com.mediassist.ai;

public class AiProviderOverloadedException extends RuntimeException {

    private final String providerName;
    private final String modelId;
    private final int statusCode;

    public AiProviderOverloadedException(String providerName, String modelId, int statusCode, String message) {
        super(String.format("[%s - %s] Rate Limit / Overloaded (HTTP %d): %s", providerName, modelId, statusCode, message));
        this.providerName = providerName;
        this.modelId = modelId;
        this.statusCode = statusCode;
    }

    public String getProviderName() { return providerName; }
    public String getModelId() { return modelId; }
    public int getStatusCode() { return statusCode; }
}
