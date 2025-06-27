"""
Admin API Endpoints für Praivio
Administrative Funktionen für Benutzer-, Rollen- und Organisationsverwaltung
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from .auth import AuthManager
from .database import DatabaseManager
from .models import *
from .security import SecurityManager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# Initialize managers
auth_manager = AuthManager(SecurityManager("secret"), DatabaseManager())

# Admin-only dependency
def require_admin(user: dict = Depends(auth_manager.get_current_user)):
    """Requires admin role"""
    if user.get('role_name') != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return user

@router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    try:
        with auth_manager.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.*, r.name as role_name, r.permissions, o.name as organization_name
                FROM users u
                JOIN roles r ON u.role_id = r.id
                JOIN organizations o ON u.organization_id = o.id
                ORDER BY u.created_at DESC
            """)
            users = [dict(row) for row in cursor.fetchall()]
            return users
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new user (admin only)"""
    try:
        # Hash password
        password_hash, password_salt = auth_manager.security.hash_password(user_data.password)
        
        # Create user
        user_id = auth_manager.db.create_user(
            username=user_data.username,
            email=user_data.email,
            password_hash=password_hash,
            password_salt=password_salt,
            role_id=user_data.role_id,
            organization_id=user_data.organization_id
        )
        
        # Log audit event
        auth_manager.db.log_audit_event(
            user_id=current_user['id'],
            action="USER_CREATED",
            details=f"Created user: {user_data.username}",
            ip_address="admin",
            user_agent="admin",
            success=True
        )
        
        # Return created user
        return auth_manager.db.get_user_by_id(user_id)
        
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserCreate,
    current_user: dict = Depends(require_admin)
):
    """Update a user (admin only)"""
    try:
        with auth_manager.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Update user data
            update_fields = []
            params = []
            
            if user_data.username:
                update_fields.append("username = ?")
                params.append(user_data.username)
            
            if user_data.email:
                update_fields.append("email = ?")
                params.append(user_data.email)
            
            if user_data.password:
                password_hash, password_salt = auth_manager.security.hash_password(user_data.password)
                update_fields.append("password_hash = ?")
                update_fields.append("password_salt = ?")
                params.extend([password_hash, password_salt])
            
            if user_data.role_id:
                update_fields.append("role_id = ?")
                params.append(user_data.role_id)
            
            if user_data.organization_id:
                update_fields.append("organization_id = ?")
                params.append(user_data.organization_id)
            
            update_fields.append("updated_at = ?")
            params.append("CURRENT_TIMESTAMP")
            params.append(user_id)
            
            if update_fields:
                query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
                cursor.execute(query, params)
                conn.commit()
            
            # Log audit event
            auth_manager.db.log_audit_event(
                user_id=current_user['id'],
                action="USER_UPDATED",
                details=f"Updated user ID: {user_id}",
                ip_address="admin",
                user_agent="admin",
                success=True
            )
            
            return auth_manager.db.get_user_by_id(user_id)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(require_admin)
):
    """Delete a user (admin only)"""
    try:
        with auth_manager.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if user exists
            cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Prevent self-deletion
            if user_id == current_user['id']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete yourself"
                )
            
            # Delete user
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
            
            # Log audit event
            auth_manager.db.log_audit_event(
                user_id=current_user['id'],
                action="USER_DELETED",
                details=f"Deleted user: {user['username']}",
                ip_address="admin",
                user_agent="admin",
                success=True
            )
            
            return {"message": "User deleted successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

@router.patch("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    current_user: dict = Depends(require_admin)
):
    """Toggle user active status (admin only)"""
    try:
        with auth_manager.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get current status
            cursor.execute("SELECT username, is_active FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Prevent self-deactivation
            if user_id == current_user['id']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate yourself"
                )
            
            # Toggle status
            new_status = not user['is_active']
            cursor.execute("UPDATE users SET is_active = ? WHERE id = ?", (new_status, user_id))
            conn.commit()
            
            # Log audit event
            action = "USER_ACTIVATED" if new_status else "USER_DEACTIVATED"
            auth_manager.db.log_audit_event(
                user_id=current_user['id'],
                action=action,
                details=f"{'Activated' if new_status else 'Deactivated'} user: {user['username']}",
                ip_address="admin",
                user_agent="admin",
                success=True
            )
            
            return {"message": f"User {'activated' if new_status else 'deactivated'} successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle user status"
        )

@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(current_user: dict = Depends(require_admin)):
    """Get all roles (admin only)"""
    try:
        with auth_manager.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM roles ORDER BY name")
            roles = [dict(row) for row in cursor.fetchall()]
            return roles
    except Exception as e:
        logger.error(f"Error fetching roles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch roles"
        )

@router.get("/organizations", response_model=List[OrganizationResponse])
async def get_organizations(current_user: dict = Depends(require_admin)):
    """Get all organizations (admin only)"""
    try:
        with auth_manager.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM organizations ORDER BY name")
            organizations = [dict(row) for row in cursor.fetchall()]
            return organizations
    except Exception as e:
        logger.error(f"Error fetching organizations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch organizations"
        ) 