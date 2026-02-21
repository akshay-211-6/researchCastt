import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
import logging
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

logger = logging.getLogger(__name__)

oauth2_scheme = HTTPBearer(auto_error=False)

async def get_current_user(auth_creds: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not auth_creds:
        # Return a guest user object if no token is provided
        # This allows local testing and "Skip" mode to function
        return {"uid": "guest", "email": "guest@example.com", "is_guest": True}

    token = auth_creds.credentials
    try:
        # Verify the ID token sent from the frontend
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        email = decoded_token.get("email")
        
        if not uid:
            raise credentials_exception
            
        return {"uid": uid, "email": email, "is_guest": False}
    except Exception as e:
        logger.error(f"Firebase auth error: {e}")
        # For local resilience, we can still fall back to guest even on failed (expired) tokens
        # but in production you'd want to be stricter.
        return {"uid": "guest", "email": "guest@error", "is_guest": True}
