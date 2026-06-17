# Demo

Hospital AI audit and verification platform with a Flask backend and a Vite + React frontend.

## Overview

This project supports image-based hospital audit workflows. It lets users manage checklists, upload proof images, compare them against reference images, generate verification results, and view resolution prediction dashboards.

## Features

- User authentication with login and registration
- Checklist creation and management
- Reference image upload and proof image verification
- Image analysis, difference detection, and explanation generation
- Alerts and audit history tracking
- Resolution prediction dashboard and metrics storage
- React frontend for viewing audit workflows and results

## Tech Stack

- Backend: Python, Flask, Flask-CORS, MongoDB, OpenCV, scikit-learn, XGBoost, Ultralytics
- Frontend: React, Vite, Tailwind CSS, Chart.js

## Project Structure

```text
demo/
├── README.md
├── backend/
│   ├── app.py
│   ├── db.py
│   ├── explanation_engine.py
│   ├── ml_model.py
│   ├── resolution_data_engine.py
│   ├── resolution_explanation_engine.py
│   ├── resolution_ml_model.py
│   ├── resolution_prediction_engine.py
│   ├── seeder.py
│   ├── vision_engine.py
│   ├── requirements.txt
│   ├── hospital_audit_500.csv
│   ├── resolution_feature_importance.json
│   ├── resolution_model_metrics.json
│   ├── resolution_best_model.pkl
│   ├── resolution_label_encoder.pkl
│   ├── rf_classifier.pkl
│   ├── yolov8n.pt
│   └── static/
│       ├── proofs/
│       └── reference/
└── frontend/
	├── index.html
	├── package.json
	├── package-lock.json
	├── postcss.config.js
	├── tailwind.config.js
	├── vite.config.js
	└── src/
		├── main.jsx
		├── App.jsx
		├── index.css
		└── pages/
			├── AlertsPanel.jsx
			├── AuditHistory.jsx
			├── ChecklistManagement.jsx
			├── Dashboard.jsx
			├── Login.jsx
			├── ResolutionPredictionDashboard.jsx
			├── UploadProof.jsx
			└── VerificationResult.jsx
```

## Setup

### Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Main API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/checklists`
- `POST /api/checklists`
- `POST /api/checklists/upload-reference`
- `POST /api/verify`

## Notes

- The backend initializes the database, seeds reference images, and trains or loads models on startup.
- Generated proof and reference images are stored under `backend/static/`.
- Keep virtual environments, build artifacts, and generated files out of Git history.
