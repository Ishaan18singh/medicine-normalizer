import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
import os

JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "mednormalize-secret-key-change-in-production"
)

JWT_ALGORITHM = "HS256"


def hash_password(password: str):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(
        password.encode(),
        salt
    ).decode()


def verify_password(password, hashed):
    return bcrypt.checkpw(
        password.encode(),
        hashed.encode()
    )


def create_access_token(
    user_id,
    email,
    role
):
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=24),
        "type": "access"
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


def create_refresh_token(user_id):
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc)
        + timedelta(days=7),
        "type": "refresh"
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )