# API Integration Guide

## Authentication Flow

```
1. POST /api/v1/auth/register   → Create account
2. POST /api/v1/auth/login      → Receive access_token + refresh_token
3. Add header: Authorization: Bearer <access_token>
4. POST /api/v1/auth/refresh    → New tokens (on 401)
```

## Upload & Inspect Flow

```
1. POST /api/v1/scans/upload
   Content-Type: multipart/form-data
   Body: file=<image>, notes=<optional>

2. Response includes:
   - scan.id, scan_code, status
   - defects[] with type, confidence, severity, bbox, recommendation
   - annotated_image_path for bbox visualization
```

## Report Generation Flow

```
1. POST /api/v1/reports/{scan_id}/generate  → 202 Accepted (async)
2. Poll GET /api/v1/reports/{report_id}     → status: generating → ready
3. GET  /api/v1/reports/{report_id}/download → PDF blob
```

## Confidence Threshold

Default: 0.50 (50%). Configurable via `CONFIDENCE_THRESHOLD` env var.

## Rate Limiting

- Default: 100 requests/minute per IP (SlowAPI)
- Uploads: counted within the same limit
