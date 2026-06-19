# 🔬 AI-Powered Semiconductor Defect Detection & Quality Inspection System

A production-ready, full-stack web application that uses Computer Vision and Deep Learning to automatically detect defects in semiconductor wafer/chip images.

---

## 🏗️ Tech Stack

| Layer       | Technology |
|-------------|-----------|
| Frontend    | React 18, Vite, Tailwind CSS, Chart.js |
| Backend     | Python FastAPI, SQLAlchemy |
| Database    | MySQL 8.0 |
| AI/ML       | TensorFlow/Keras (EfficientNetB3), YOLOv8, OpenCV |
| Auth        | JWT (access + refresh tokens) |
| PDF Reports | ReportLab |
| Email       | aiosmtplib |
| Deployment  | Vercel (frontend), Render (backend), Docker |

---

## 📁 Project Structure

```
semiconductor-defect-detection/
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              # Home, Login, Register, Dashboard, etc.
│   │   ├── components/         # Layout + common reusable components
│   │   ├── context/            # AuthContext (JWT state)
│   │   ├── services/           # Axios API service layer
│   │   ├── hooks/              # useApi hook
│   │   └── utils/              # helpers, constants
│   ├── vercel.json
│   └── Dockerfile
│
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/routes/         # auth, scans, analytics, reports, notifications, users
│   │   ├── core/               # config, database, security, deps
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # prediction, email, PDF report
│   │   └── utils/              # helpers (severity, recommendations)
│   ├── requirements.txt
│   ├── render.yaml
│   └── Dockerfile
│
├── ai_model/                   # AI/ML pipeline
│   ├── model.py                # EfficientNetB3 classifier
│   ├── train.py                # Phase 1 & 2 training script
│   ├── evaluate.py             # Evaluation + confusion matrix
│   ├── yolo_train.py           # YOLOv8 training script
│   ├── generate_synthetic_data.py  # Synthetic dataset generator
│   ├── inference.py            # Standalone inference CLI
│   ├── weights/                # Place .h5 and .pt weights here
│   └── utils/
│       ├── preprocessing.py    # CLAHE, augmentation, blob detection
│       └── visualization.py    # Grad-CAM, confusion matrix, bbox overlay
│
├── database/
│   ├── schema.sql              # Full MySQL DDL (6 tables)
│   ├── seed_data.sql           # Demo data
│   └── migrations/
│
├── docs/
├── docker-compose.yml          # Full-stack one-command deployment
├── .env.example
└── README.md
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- Python 3.11+
- MySQL 8.0 (or use Docker)
- Git

---

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd semiconductor-defect-detection
```

---

### 2. Database Setup

```sql
-- In MySQL client:
source database/schema.sql;
source database/seed_data.sql;
```

---

### 3. Backend Setup

```bash
cd backend

# Copy and configure environment
copy .env.example .env
# Edit .env with your MySQL credentials and secret key

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn app.main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**
Interactive API docs: **http://localhost:8000/docs** (DEBUG=True only)

---

### 4. Frontend Setup

```bash
cd frontend

# Copy and configure environment
copy .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

### 5. (Optional) Train the AI Model

```bash
cd ai_model

# Step 1: Generate synthetic training data
python generate_synthetic_data.py --output_dir data --samples_per_class 300

# Step 2: Phase 1 training (feature extraction)
python train.py --train_dir data/train --val_dir data/val --epochs 30 --phase 1

# Step 3: Phase 2 fine-tuning
python train.py --train_dir data/train --val_dir data/val --epochs 20 --phase 2 \
                --weights weights/defect_model_best.h5

# Step 4: YOLOv8 training (for bounding boxes)
python yolo_train.py --dataset_dir data --epochs 50

# Step 5: Evaluate
python evaluate.py --model_path weights/defect_model.h5 --test_dir data/test
```

Place the trained weights in `ai_model/weights/`:
- `defect_model.h5` — TensorFlow/Keras classifier
- `yolov8_defect.pt` — YOLOv8 detector

> **Without weights**, the system uses a **mock prediction mode** that still demonstrates the full pipeline using image statistics.

---

## 🐳 Docker Deployment (One Command)

```bash
# 1. Copy and configure env
copy .env.example .env

# 2. Start all services (MySQL + Backend + Frontend)
docker-compose up --build -d

# 3. Check logs
docker-compose logs -f backend
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8000 |
| MySQL    | localhost:3306 |

To stop: `docker-compose down`

---

## ☁️ Cloud Deployment

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel

# Set environment variable in Vercel dashboard:
# VITE_API_URL = https://your-render-backend.onrender.com/api/v1
```

### Backend → Render

1. Push to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Set root directory to `backend/`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables from `.env.example`

### Database → PlanetScale / Railway / Aiven MySQL

Create a MySQL 8.0 database, run `schema.sql`, and point `DB_HOST/DB_USER/DB_PASSWORD` to it.

---

## 🔐 Default Credentials

| Role     | Email                              | Password    |
|----------|------------------------------------|-------------|
| Admin    | admin@semiconductor-ai.com         | Admin@1234  |
| Engineer | alice@semiconductor-ai.com         | Admin@1234  |
| Viewer   | carol@semiconductor-ai.com         | Admin@1234  |

> Change all passwords immediately in production.

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| **AI Detection** | EfficientNetB3 classifier + YOLOv8 bounding box detector |
| **6 Defect Types** | Scratch, Crack, Contamination, Missing Pattern, Surface Defect, Other |
| **4 Severity Levels** | Low, Medium, High, Critical |
| **Recommendation Engine** | Auto-generates maintenance suggestions per defect type |
| **Bounding Box Viz** | OpenCV-drawn overlays with confidence + severity labels |
| **PDF Reports** | ReportLab PDF with image, defect table, recommendations |
| **Email Alerts** | Critical defect and report-ready email notifications |
| **Analytics** | 6 Chart.js charts: pie, doughnut, bar, line x3 |
| **Scan History** | Paginated, searchable, sortable, filterable table |
| **JWT Auth** | Access + refresh tokens, forgot/reset password flow |
| **Role-Based Access** | Admin, Engineer, Viewer roles |
| **Audit Logging** | All actions logged to `audit_logs` table |
| **Responsive UI** | Tailwind dark-mode UI, works on mobile/tablet/desktop |

---

## 📡 API Reference

Base URL: `http://localhost:8000/api/v1`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get JWT tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset with token |
| GET  | `/auth/me` | Get current user |
| PATCH| `/auth/me` | Update profile |
| POST | `/auth/change-password` | Change password |

### Scans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scans/upload` | Upload image + run AI detection |
| GET  | `/scans/` | List scans (paginated, filtered) |
| GET  | `/scans/{id}` | Get scan detail with defects |
| DELETE | `/scans/{id}` | Delete scan + image file |
| PATCH | `/scans/{scan_id}/defects/{defect_id}` | Mark false positive |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/dashboard` | KPI summary |
| GET | `/analytics/defect-types` | Defect type distribution |
| GET | `/analytics/severity-distribution` | Severity counts |
| GET | `/analytics/monthly-trends` | Monthly scan + defect trends |
| GET | `/analytics/defect-frequency` | Daily frequency (last N days) |
| GET | `/analytics/quality-score` | Quality score over time |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reports/{scan_id}/generate` | Generate PDF (async) |
| GET  | `/reports/` | List reports |
| GET  | `/reports/{id}` | Get report status |
| GET  | `/reports/{id}/download` | Download PDF |
| DELETE | `/reports/{id}` | Delete report |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET   | `/notifications/` | List notifications |
| GET   | `/notifications/unread-count` | Unread count |
| PATCH | `/notifications/mark-read` | Mark specific as read |
| PATCH | `/notifications/mark-all-read` | Mark all read |
| DELETE| `/notifications/{id}` | Delete notification |

---

## 🗄️ Database Schema

```
users           — Authentication, roles, profile
scans           — Uploaded images, status, processing metadata
defects         — AI detection results, bbox, severity, recommendation
reports         — Generated PDF reports, file paths
notifications   — Email + in-app alerts
audit_logs      — Full action audit trail
```

---

## 🧠 AI Model Architecture

```
Input Image (224×224×3)
       ↓
EfficientNetB3 (ImageNet pretrained, frozen in Phase 1)
       ↓
Global Average Pooling
       ↓
BatchNorm → Dropout(0.4) → Dense(256, ReLU) → Dropout(0.2)
       ↓
Softmax(6)  →  [scratch, crack, contamination, missing_pattern, surface_defect, other]

YOLOv8 (parallel) → Bounding box localization
```

**Training:**
- Phase 1: Feature extraction (base frozen, 30 epochs)
- Phase 2: Fine-tuning (top 30 layers unfrozen, 1e-5 LR, 20 epochs)
- Augmentation: rotation, flip, brightness, contrast, Gaussian noise

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 Author

Built with ❤️ as a production-ready reference implementation for AI-powered quality control in semiconductor manufacturing.
