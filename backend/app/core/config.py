# JWT configuration
import os

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-this-later")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
