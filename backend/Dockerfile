# ==============================================================================
# MediAssist-AI Spring Boot 3.4.x (Java 21 LTS) Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Build JAR with Maven & OpenJDK 21
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace/app

# Cache Maven dependencies
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN ./mvnw dependency:go-offline -B || true

# Copy source code and package application
COPY src src
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Minimal Distroless / Alpine Runtime
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Add non-root application user for Zero-Trust container security
RUN addgroup -S mediassist && adduser -S mediassist -G mediassist

# Copy compiled JAR from builder
COPY --from=builder /workspace/app/target/*.jar app.jar

# Setup directories for local EMR document storage fallback
RUN mkdir -p /app/uploads && chown -R mediassist:mediassist /app

USER mediassist:mediassist

# Production JVM optimizations for container environment
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"
ENV SERVER_PORT=5001

EXPOSE 5001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/v1/health/live || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
