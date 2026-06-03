from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status, UploadFile, File
from dotenv import load_dotenv
load_dotenv ()
from fastapi.security import HTTPBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Import medicine modules after DB is initialized
from medicine_matching import matching_engine, init_medicine_db
from ocr_processor import extract_medicines_from_image

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'mednormalize-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@mednormalize.ai')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Auth Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Optional[str] = 'user'

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
class LoginResponse(UserResponse):
    access_token: str
    token_type: str    

# Medicine Models
class MedicineNormalizeRequest(BaseModel):
    medicine: str

class MedicineNormalizeResponse(BaseModel):
    input: str
    normalized: str
    type: str
    confidence: float
    alternatives: List[str]

class BulkNormalizeRequest(BaseModel):
    medicines: List[str]

class AnalyticsResponse(BaseModel):
    total_searches: int
    top_medicines: List[Dict[str, Any]]
    avg_confidence: float
    error_rate: float

# Auth Helpers
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24),
        'type': 'access'
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
        'type': 'refresh'
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


from fastapi.security import HTTPAuthorizationCredentials

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:

    token = None

    # Authorization header (Swagger/API clients)
    if credentials:
        token = credentials.credentials

    # Cookie fallback (Frontend)
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=401,
                detail="Invalid token type"
            )

        user = await db.users.find_one(
            {"_id": ObjectId(payload["sub"])},
            {"_id": 0, "password_hash": 0}
        )

        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        user["id"] = str(payload["sub"])
        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

# Create the main app
app = FastAPI(title='MedNormalize AI API', version='1.0.0')

# Create routers
api_router = APIRouter(prefix='/api')
auth_router = APIRouter(prefix='/api/auth', tags=['Authentication'])

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)

# Auth Endpoints
@auth_router.post('/register', response_model=UserResponse)
async def register(user: UserRegister, response: Response):
    user_dict = user.model_dump()
    user_dict['email'] = user_dict['email'].lower()
    existing = await db.users.find_one({'email': user_dict['email']})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    password_hash = hash_password(user_dict.pop('password'))
    user_dict['password_hash'] = password_hash
    user_dict['created_at'] = datetime.now(timezone.utc)
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, user_dict['email'], user_dict['role'])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key='access_token', value=access_token, httponly=True, secure=False, samesite='lax', max_age=86400, path='/')
    response.set_cookie(key='refresh_token', value=refresh_token, httponly=True, secure=False, samesite='lax', max_age=604800, path='/')
    
    return UserResponse(id=user_id, **user_dict)

@auth_router.post('/login', response_model=LoginResponse)
async def login(credentials: UserLogin, response: Response):
    email = credentials.email.lower()

    user = await db.users.find_one({'email': email})

    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(
            status_code=401,
            detail='Invalid email or password'
        )

    user_id = str(user['_id'])

    access_token = create_access_token(
        user_id,
        user['email'],
        user.get('role', 'user')
    )

    refresh_token = create_refresh_token(user_id)

    response.set_cookie(
        key='access_token',
        value=access_token,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=86400,
        path='/'
    )

    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=604800,
        path='/'
    )

    return LoginResponse(
        id=user_id,
        email=user['email'],
        name=user['name'],
        role=user.get('role', 'user'),
        created_at=user['created_at'],
        access_token=access_token,
        token_type='bearer'
    )

@auth_router.post('/logout')
async def logout(response: Response):
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/')
    return {'message': 'Logged out successfully'}

@auth_router.get('/me', response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# Medicine Normalization Endpoints
@api_router.post('/normalize', response_model=MedicineNormalizeResponse)
async def normalize_medicine(request: MedicineNormalizeRequest, current_user: dict = Depends(get_current_user)):
    result = matching_engine.match_medicine(request.medicine)
    
    # Log search
    await db.searches.insert_one({
        'user_id': current_user['id'],
        'medicine': request.medicine,
        'result': result,
        'timestamp': datetime.now(timezone.utc)
    })
    
    return result

@api_router.post('/bulk-normalize')
async def bulk_normalize(request: BulkNormalizeRequest, current_user: dict = Depends(get_current_user)):
    results = []
    for medicine in request.medicines:
        result = matching_engine.match_medicine(medicine)
        results.append(result)
    
    return {'results': results}

@api_router.post('/scan-prescription')
async def scan_prescription(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail='File must be an image')
    
    image_bytes = await file.read()
    extracted_medicines = extract_medicines_from_image(image_bytes)
    
    results = []
    for medicine in extracted_medicines:
        result = matching_engine.match_medicine(medicine)
        results.append(result)
    
    return {'extracted_medicines': extracted_medicines, 'results': results}

@api_router.get('/alternatives/{medicine}')
async def get_alternatives(medicine: str, current_user: dict = Depends(get_current_user)):
    result = matching_engine.match_medicine(medicine)
    if result['normalized']:
        alternatives = matching_engine.get_all_brands(result['normalized'])
        return {'generic_name': result['normalized'], 'alternatives': alternatives}
    return {'generic_name': None, 'alternatives': []}

@api_router.get('/analytics', response_model=AnalyticsResponse)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    
    total_searches = await db.searches.count_documents({})
    
    # Top medicines
    pipeline = [
        {'$group': {'_id': '$medicine', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 10}
    ]
    top_medicines_cursor = db.searches.aggregate(pipeline)
    top_medicines = await top_medicines_cursor.to_list(length=10)
    
    # Average confidence
    avg_pipeline = [
        {'$group': {'_id': None, 'avg_confidence': {'$avg': '$result.confidence'}}}
    ]
    avg_cursor = db.searches.aggregate(avg_pipeline)
    avg_result = await avg_cursor.to_list(length=1)
    avg_confidence = avg_result[0]['avg_confidence'] if avg_result else 0.0
    
    # Error rate (confidence < 0.7)
    low_confidence = await db.searches.count_documents({'result.confidence': {'$lt': 0.7}})
    error_rate = (low_confidence / total_searches * 100) if total_searches > 0 else 0.0
    
    return AnalyticsResponse(
        total_searches=total_searches,
        top_medicines=top_medicines,
        avg_confidence=avg_confidence,
        error_rate=error_rate
    )

# Include routers
app.include_router(auth_router)
app.include_router(api_router)

@app.get('/health')
async def health_check():
    return {'status': 'healthy', 'service': 'MedNormalize AI'}

# Startup event
@app.on_event('startup')
async def startup_event():
    logger.info('Starting MedNormalize AI API')
    
    # Initialize medicine database
    await init_medicine_db(db)
    
    # Seed admin user
    admin_email = ADMIN_EMAIL.lower()
    existing_admin = await db.users.find_one({'email': admin_email})
    if not existing_admin:
        admin_data = {
            'email': admin_email,
            'password_hash': hash_password(ADMIN_PASSWORD),
            'name': 'Admin',
            'role': 'admin',
            'created_at': datetime.now(timezone.utc)
        }
        await db.users.insert_one(admin_data)
        logger.info(f'Admin user created: {admin_email}')
    elif not verify_password(ADMIN_PASSWORD, existing_admin['password_hash']):
        await db.users.update_one(
            {'email': admin_email},
            {'$set': {'password_hash': hash_password(ADMIN_PASSWORD)}}
        )
        logger.info('Admin password updated')
    
    # Write test credentials
    logger.info(f'Admin credentials: {ADMIN_EMAIL} / {ADMIN_PASSWORD}')

@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
    logger.info('MongoDB connection closed')
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)    