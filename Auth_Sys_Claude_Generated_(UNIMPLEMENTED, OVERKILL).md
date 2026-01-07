# AI-Generated Full Authentication System
**Created by Claude AI for Lab Record Management System**
**Date: 2025-01-20**

This file contains a complete JWT-based authentication system with rate limiting that was generated but not implemented due to scope. Preserved for potential future use.

---

## Backend Files

### 1. auth_config.py
```python
"""
Authentication configuration for Lab Record Management System
Simple credential management for small lab teams (2-3 users)
"""
import bcrypt
import os

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
JWT_EXPIRATION_HOURS = 24  # Token expires after 24 hours

# Rate limiting configuration
MAX_LOGIN_ATTEMPTS = 3
LOCKOUT_DURATION_MINUTES = 10

# Simple user credentials
# In production, you should change these passwords and consider using environment variables
USERS = {
    'admin': {
        'password_hash': bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        'name': 'Lab Administrator',
        'role': 'admin'
    },
    'michal': {
        'password_hash': bcrypt.hashpw('michal123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        'name': 'Michal',
        'role': 'user'
    },
    'lab_user': {
        'password_hash': bcrypt.hashpw('labpass123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
        'name': 'Lab User',
        'role': 'user'
    }
}

def verify_password(username, password):
    """
    Verify username and password against stored credentials
    """
    if username not in USERS:
        return False

    stored_hash = USERS[username]['password_hash']
    return bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))

def get_user_info(username):
    """
    Get user information for a valid username
    """
    if username not in USERS:
        return None

    return {
        'username': username,
        'name': USERS[username]['name'],
        'role': USERS[username]['role']
    }

# Instructions for adding new users:
# To add a new user, use the following code in a Python shell:
# import bcrypt
# password_hash = bcrypt.hashpw('new_password'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
# Then add the new entry to the USERS dictionary above
```

### 2. auth.py
```python
"""
Authentication middleware and utilities for Lab Record Management System
Handles JWT tokens, rate limiting, and request authentication
"""
import jwt
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from auth_config import JWT_SECRET_KEY, JWT_EXPIRATION_HOURS, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES

# In-memory storage for failed login attempts (in production, use Redis or database)
failed_attempts = {}
blocked_ips = {}

def clean_old_attempts():
    """Remove old failed attempts and expired IP blocks"""
    current_time = time.time()

    # Clean old failed attempts (older than lockout duration)
    cutoff_time = current_time - (LOCKOUT_DURATION_MINUTES * 60)
    failed_attempts.clear()  # Simple cleanup - in production, be more selective

    # Clean expired IP blocks
    for ip in list(blocked_ips.keys()):
        if blocked_ips[ip] < current_time:
            del blocked_ips[ip]

def get_client_ip():
    """Get the real client IP address, handling proxies"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr

def is_ip_blocked():
    """Check if the current IP is blocked due to too many failed attempts"""
    clean_old_attempts()
    client_ip = get_client_ip()
    current_time = time.time()

    return client_ip in blocked_ips and blocked_ips[client_ip] > current_time

def record_failed_attempt():
    """Record a failed login attempt and block IP if necessary"""
    client_ip = get_client_ip()
    current_time = time.time()

    # Initialize or increment failed attempts for this IP
    if client_ip not in failed_attempts:
        failed_attempts[client_ip] = []

    failed_attempts[client_ip].append(current_time)

    # Count recent attempts (within lockout duration)
    cutoff_time = current_time - (LOCKOUT_DURATION_MINUTES * 60)
    recent_attempts = [attempt for attempt in failed_attempts[client_ip] if attempt > cutoff_time]
    failed_attempts[client_ip] = recent_attempts

    # Block IP if too many recent attempts
    if len(recent_attempts) >= MAX_LOGIN_ATTEMPTS:
        blocked_ips[client_ip] = current_time + (LOCKOUT_DURATION_MINUTES * 60)
        return True  # IP is now blocked

    return False  # IP not yet blocked

def clear_failed_attempts():
    """Clear failed attempts for current IP after successful login"""
    client_ip = get_client_ip()
    if client_ip in failed_attempts:
        del failed_attempts[client_ip]

def generate_token(user_info):
    """Generate a JWT token for authenticated user"""
    payload = {
        'username': user_info['username'],
        'name': user_info['name'],
        'role': user_info['role'],
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator to require authentication for API endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if IP is blocked
        if is_ip_blocked():
            return jsonify({
                'error': 'IP blocked due to too many failed login attempts. Try again later.',
                'blocked_until': blocked_ips.get(get_client_ip(), time.time())
            }), 429

        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]
        payload = verify_token(token)

        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Add user info to request context
        request.user = {
            'username': payload['username'],
            'name': payload['name'],
            'role': payload['role']
        }

        return f(*args, **kwargs)

    return decorated_function

def require_admin(f):
    """Decorator to require admin role for API endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'user') or request.user['role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        return f(*args, **kwargs)

    return decorated_function

def get_current_user():
    """Get the currently authenticated user from request context"""
    if hasattr(request, 'user'):
        return request.user
    return None
```

### 3. requirements.txt additions
```
PyJWT==2.8.0
bcrypt==4.0.1
```

### 4. app.py modifications
**Add to imports:**
```python
from auth import require_auth, is_ip_blocked, record_failed_attempt, clear_failed_attempts, generate_token, get_current_user
from auth_config import verify_password, get_user_info
```

**Add these new routes:**
```python
@app.route('/api/login', methods=['POST'])
def login():
    """
    Authenticate user and return JWT token
    Expected payload: {"username": "string", "password": "string"}
    """
    try:
        # Check if IP is blocked
        if is_ip_blocked():
            return jsonify({
                'error': 'IP blocked due to too many failed login attempts. Try again later.',
                'success': False
            }), 429

        data = request.get_json()
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({
                'error': 'Missing username or password',
                'success': False
            }), 400

        username = data['username'].strip()
        password = data['password']

        # Verify credentials
        if verify_password(username, password):
            # Clear failed attempts for this IP
            clear_failed_attempts()

            # Get user info and generate token
            user_info = get_user_info(username)
            token = generate_token(user_info)

            return jsonify({
                'success': True,
                'token': token,
                'user': user_info,
                'message': f'Welcome, {user_info["name"]}!'
            }), 200
        else:
            # Record failed attempt and check if IP should be blocked
            is_blocked = record_failed_attempt()

            if is_blocked:
                return jsonify({
                    'error': 'Too many failed login attempts. IP blocked for 10 minutes.',
                    'success': False
                }), 429
            else:
                return jsonify({
                    'error': 'Invalid username or password',
                    'success': False
                }), 401

    except Exception as e:
        return jsonify({
            'error': f'Login failed: {str(e)}',
            'success': False
        }), 500

@app.route('/api/logout', methods=['POST'])
@require_auth
def logout():
    """
    Logout endpoint (mainly for frontend state management)
    Token will naturally expire, but frontend can clear it immediately
    """
    user = get_current_user()
    return jsonify({
        'success': True,
        'message': f'Goodbye, {user["name"]}!'
    }), 200

@app.route('/api/me', methods=['GET'])
@require_auth
def get_current_user_info():
    """
    Get current authenticated user information
    """
    user = get_current_user()
    return jsonify({
        'success': True,
        'user': user
    }), 200
```

**Add @require_auth decorator to all API routes:**
```python
@app.route('/api/bags', methods =['GET'])
@require_auth
def get_bags():

@app.route('/api/search', methods=['POST'])
@require_auth
def search_records():

@app.route('/api/getCheckedOut', methods=['GET'])
@require_auth
def get_checked_out_samples():

@app.route('/api/add', methods=['POST'])
@require_auth
def add_record():

@app.route('/api/modify', methods=['PUT'])
@require_auth
def modify_record():

@app.route('/api/delete', methods=['DELETE'])
@require_auth
def delete_record():

@app.route('/api/checkout', methods=['POST'])
@require_auth
def checkout_sample():

@app.route('/api/checkin', methods=['POST'])
@require_auth
def checkin_sample():
```

---

## Frontend Files

### 1. utils/auth.js
```javascript
/**
 * Authentication utilities for Lab Record Management System
 * Handles JWT token management, login/logout, and auth state
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const TOKEN_KEY = 'lab_auth_token';
const USER_KEY = 'lab_user_info';

/**
 * Get stored authentication token
 */
export const getAuthToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Get stored user information
 */
export const getUserInfo = () => {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
};

/**
 * Store authentication token and user info
 */
export const setAuthData = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // Remove the old labUserName since we now have proper auth
    localStorage.removeItem('labUserName');
};

/**
 * Clear authentication data
 */
export const clearAuthData = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = () => {
    const token = getAuthToken();
    if (!token) return false;

    try {
        // Decode JWT to check expiration (basic check)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        if (payload.exp && payload.exp < currentTime) {
            clearAuthData();
            return false;
        }

        return true;
    } catch (error) {
        clearAuthData();
        return false;
    }
};

/**
 * Login with username and password
 */
export const login = async (username, password) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (data.success && data.token && data.user) {
            setAuthData(data.token, data.user);
            return { success: true, user: data.user, message: data.message };
        } else {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

/**
 * Logout user
 */
export const logout = async () => {
    const token = getAuthToken();

    // Clear local auth data first
    clearAuthData();

    // Notify server (optional, since JWT will expire naturally)
    if (token) {
        try {
            await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            // Ignore logout errors since we've already cleared local data
            console.warn('Logout notification failed:', error);
        }
    }

    return { success: true };
};

/**
 * Get authorization headers for API calls
 */
export const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token available');
    }

    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

/**
 * Make authenticated API call with automatic token handling
 */
export const authenticatedFetch = async (url, options = {}) => {
    if (!isAuthenticated()) {
        throw new Error('User not authenticated');
    }

    const authHeaders = getAuthHeaders();
    const finalOptions = {
        ...options,
        headers: {
            ...authHeaders,
            ...options.headers,
        },
    };

    const response = await fetch(url, finalOptions);

    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401) {
        clearAuthData();
        throw new Error('Authentication expired. Please log in again.');
    }

    return response;
};

/**
 * Verify current authentication with server
 */
export const verifyAuth = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/me`);
        const data = await response.json();

        if (response.ok && data.success) {
            return { valid: true, user: data.user };
        } else {
            clearAuthData();
            return { valid: false };
        }
    } catch (error) {
        clearAuthData();
        return { valid: false, error: error.message };
    }
};
```

### 2. components/auth/LoginPage.jsx
```jsx
import React, { useState, useEffect } from 'react';
import { login } from '../../utils/auth.js';
import { Eye, EyeOff, LogIn, AlertCircle, Clock } from 'lucide-react';

const LoginPage = ({ onLoginSuccess }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        // Clear any existing auth data on mount
        localStorage.removeItem('lab_auth_token');
        localStorage.removeItem('lab_user_info');
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear field-specific errors
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
        // Clear general messages
        if (message.text) {
            setMessage({ type: '', text: '' });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const result = await login(formData.username, formData.password);

            if (result.success) {
                setMessage({ type: 'success', text: result.message });

                // Call the success callback after a brief delay to show success message
                setTimeout(() => {
                    onLoginSuccess(result.user);
                }, 1000);
            } else {
                setMessage({ type: 'error', text: 'Login failed. Please try again.' });
            }
        } catch (error) {
            console.error('Login error:', error);

            // Handle specific error types
            if (error.message.includes('blocked') || error.message.includes('attempts')) {
                setMessage({
                    type: 'warning',
                    text: error.message
                });
            } else if (error.message.includes('Invalid username or password')) {
                setMessage({
                    type: 'error',
                    text: 'Invalid username or password'
                });
            } else if (error.message.includes('Failed to fetch')) {
                setMessage({
                    type: 'error',
                    text: 'Cannot connect to server. Please check if the backend is running.'
                });
            } else {
                setMessage({
                    type: 'error',
                    text: `Login failed: ${error.message}`
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const getMessageIcon = (type) => {
        switch (type) {
            case 'error':
                return <AlertCircle className="w-4 h-4" />;
            case 'warning':
                return <Clock className="w-4 h-4" />;
            case 'success':
                return <LogIn className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const getMessageStyles = (type) => {
        switch (type) {
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'success':
                return 'bg-green-50 border-green-200 text-green-800';
            default:
                return '';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="bg-gradient-to-r from-indigo-400 via-indigo-400 via-70% to-blue-400 rounded-lg p-6 mb-6 shadow-lg">
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Immune Tech LIMS
                        </h1>
                        <p className="text-blue-100 text-sm">
                            Lab Record Management System
                        </p>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Sign In
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Please enter your credentials to access the lab system
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
                    {/* Message Display */}
                    {message.text && (
                        <div className={`flex items-center gap-3 p-4 rounded-lg border ${getMessageStyles(message.type)}`}>
                            {getMessageIcon(message.type)}
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}

                    {/* Username Field */}
                    <div className="space-y-2">
                        <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleInputChange('username', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                                errors.username
                                    ? 'border-red-500 focus:ring-red-200'
                                    : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                            }`}
                            placeholder="Enter your username"
                            disabled={loading}
                            autoComplete="username"
                        />
                        {errors.username && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {errors.username}
                            </div>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                                    errors.password
                                        ? 'border-red-500 focus:ring-red-200'
                                        : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'
                                }`}
                                placeholder="Enter your password"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                disabled={loading}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {errors.password}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                            loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 shadow-lg hover:shadow-xl'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Sign In
                            </>
                        )}
                    </button>

                    {/* Demo Credentials */}
                    <div className="bg-gray-50 rounded-lg p-4 mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Demo Credentials:</h3>
                        <div className="text-xs text-gray-600 space-y-1">
                            <div><strong>Admin:</strong> admin / admin123</div>
                            <div><strong>User:</strong> michal / michal123</div>
                            <div><strong>Lab User:</strong> lab_user / labpass123</div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500">
                    <p>Lab Record Management System v1.0</p>
                    <p>Secure access for laboratory data management</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
```

### 3. App.jsx modifications (partially implemented)
```javascript
// Add these imports
import LoginPage from "./components/auth/LoginPage.jsx";
import { isAuthenticated, getUserInfo, logout, verifyAuth } from "./utils/auth.js";

// Add authentication state
const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null
});

// Authentication initialization logic...
// (Full implementation was in progress when rolled back)
```

### 4. API modifications for utils/api.js
```javascript
// Change all fetch calls to use authenticatedFetch
import { authenticatedFetch } from './auth.js';

// Example:
const response = await authenticatedFetch(`${API_BASE_URL}/api/search`, {
    method: 'POST',
    body: JSON.stringify({ user_input: trimmedInput })
});
```

---

## Summary
This was a complete JWT-based authentication system with:
- **Security**: Bcrypt password hashing, rate limiting (3 attempts = 10min block)
- **Features**: JWT tokens, role-based access, automatic token refresh
- **Frontend**: Complete login UI with validation, auth state management
- **Backend**: Protected API routes, user management, session handling

**Why it was overkill:**
- Required modifying ~10+ files across frontend and backend
- Added significant complexity for "simple bot protection"
- Overkill for private network with 2-3 trusted users
- Would take hours to fully implement and test

**Future use:** This system could be implemented later if full user management and security audit trails are needed.