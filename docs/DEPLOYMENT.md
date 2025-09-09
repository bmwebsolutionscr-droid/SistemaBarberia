# Guía de Despliegue en Railway (Opcional - Para Backend FastAPI)

Si decides implementar el backend opcional con FastAPI, aquí tienes la guía completa.

## 📁 Estructura del Backend

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   ├── routers/
│   ├── services/
│   └── utils/
├── requirements.txt
├── Dockerfile
└── railway.toml
```

## 🐍 Backend con FastAPI

### 1. Crear el Backend

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Barbería API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambiar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Barbería API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

### 2. Dependencias

```txt
# backend/requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
supabase==2.0.0
python-dotenv==1.0.0
pydantic==2.5.0
httpx==0.25.2
```

### 3. Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. Configuración Railway

```toml
# backend/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## 🚀 Despliegue en Railway

### 1. Preparar el Proyecto

```bash
# Crear carpeta backend
mkdir backend
cd backend

# Crear archivos necesarios
# (copiar los archivos de arriba)
```

### 2. Conectar con Railway

1. Ve a [Railway](https://railway.app)
2. Crea cuenta y nuevo proyecto
3. Conecta tu repositorio GitHub
4. Selecciona la carpeta `backend`

### 3. Configurar Variables de Entorno

En Railway Dashboard, agrega:
```
SUPABASE_URL=tu_url_supabase
SUPABASE_SERVICE_KEY=tu_service_key
ENVIRONMENT=production
```

### 4. Desplegar

Railway desplegará automáticamente cuando hagas push.

## 🔗 Conectar Frontend con Backend

### Actualizar Frontend

```typescript
// src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  async generateAdvancedReport(data: any) {
    const response = await fetch(`${API_BASE_URL}/api/reports/advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  }
}
```

### Variables de Entorno Frontend

```env
# .env.local
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

## 📊 Ejemplo de Endpoint Avanzado

```python
# backend/app/routers/reports.py
from fastapi import APIRouter, Depends
from typing import List, Dict
import asyncio

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.post("/advanced")
async def generate_advanced_report(
    barber_id: str,
    start_date: str,
    end_date: str
):
    # Conectar con Supabase
    # Obtener datos
    # Procesar estadísticas avanzadas
    # Generar proyecciones
    
    return {
        "summary": {
            "total_appointments": 45,
            "revenue": 675000,
            "growth_rate": 15.5
        },
        "forecasting": {
            "next_month_prediction": 52
        }
    }
```

## 🔧 Comandos Útiles

```bash
# Desarrollo local
uvicorn app.main:app --reload

# Build Docker local
docker build -t barberia-api .
docker run -p 8000:8000 barberia-api

# Railway CLI
npm install -g @railway/cli
railway login
railway link
railway up
```

## 📝 Notas Importantes

1. **El backend es opcional** - El frontend funciona perfectamente solo con Supabase
2. **Usar para features avanzadas** como ML, reportes complejos, integraciones
3. **Railway tiene plan gratuito** con limitaciones
4. **Alternativas**: Render, Heroku, DigitalOcean

## 🔐 Seguridad

```python
# Middleware de seguridad
from fastapi.security import HTTPBearer
from fastapi import HTTPException, Depends

security = HTTPBearer()

async def verify_token(token: str = Depends(security)):
    # Verificar JWT de Supabase
    # Obtener usuario
    # Validar permisos
    pass
```
