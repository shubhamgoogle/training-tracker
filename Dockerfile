FROM python:3.12-slim

# Run as a non-root user for container security (Principle of Least Privilege)
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

COPY server.py /app/server.py
COPY static /app/static

RUN mkdir -p /app/data && chown -R appuser:appuser /app

USER appuser

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV DB_PATH=/app/data/tracker.db

EXPOSE 8080

# Cloud Run injects PORT and routes traffic to the container interface
CMD ["python3", "-c", "import os, server; os.environ.setdefault('HOST', '0.0.0.0'); server.run_server()"]
