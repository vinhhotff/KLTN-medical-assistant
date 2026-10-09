#!/bin/bash
# ==============================================================================
# Generate Self-Signed SSL Certificates for MediAssist-AI Local Testing / Demo
# ==============================================================================
set -e

SSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ssl"
mkdir -p "${SSL_DIR}"

if [ ! -f "${SSL_DIR}/server.crt" ] || [ ! -f "${SSL_DIR}/server.key" ]; then
    echo "🔒 Generating self-signed SSL certificate for MediAssist-AI..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${SSL_DIR}/server.key" \
        -out "${SSL_DIR}/server.crt" \
        -subj "/C=VN/ST=HoChiMinh/L=ThuDuc/O=MediAssist-AI/OU=Capstone/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
    echo "✅ SSL certificate generated at: ${SSL_DIR}/server.crt"
else
    echo "ℹ️  SSL certificate already exists at: ${SSL_DIR}/server.crt"
fi
