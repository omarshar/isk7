/**
 * نظام المصادقة لنظام إدارة المخزون - اسكندويتش
 * Authentication System for Eskandawitch Inventory Management
 */

// استخدام ROLES من ملف firebase-config.js بدلاً من إعادة تعريفه
// Use ROLES from firebase-config.js instead of redefining it
// const ROLES = {
//     ADMIN: 'admin',
//     INVENTORY_MANAGER: 'inventory_manager',
//     PURCHASE_MANAGER: 'purchase_manager'
// };

// تعريف صلاحيات الوصول للصفحات حسب الدور
// Define page access permissions by role
const PAGE_PERMISSIONS = {
    'index.html': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.PURCHASE_MANAGER],
    'products.html': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
    'inventory.html': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
    'purchases.html': [ROLES.ADMIN, ROLES.PURCHASE_MANAGER],
    'branches.html': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
    'invoices.html': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
    'cost.html': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.PURCHASE_MANAGER],
    'waste.html': [ROLES.ADMIN, ROLES.INVENTORY_MANAGER],
    'users.html': [ROLES.ADMIN]
};

// تهيئة نظام المصادقة عند تحميل الصفحة
// Initialize authentication system on page load
(function() {
    // التحقق من حالة تسجيل الدخول عند تحميل أي صفحة
    // Check login status when any page loads
    checkAuthStatus();
})();

/**
 * التحقق من حالة تسجيل الدخول
 * Check authentication status
 */
function checkAuthStatus() {
    // محاولة استخدام Firebase أولاً
    // Try Firebase first
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // المستخدم مسجل الدخول في Firebase
                // User is signed in with Firebase
                getUserRoleFromFirebase(user.uid)
                    .then(role => {
                        handleAuthenticatedUser(user.email, role);
                    })
                    .catch(error => {
                        console.error("Error getting user role from Firebase:", error);
                        handleAuthenticatedUser(user.email, ROLES.INVENTORY_MANAGER); // دور افتراضي - Default role
                    });
            } else {
                // المستخدم غير مسجل الدخول في Firebase، استخدم localStorage كبديل
                // User is not signed in with Firebase, use localStorage as fallback
                checkLocalAuthStatus();
            }
        });
    } else {
        // Firebase غير متاح، استخدم localStorage
        // Firebase not available, use localStorage
        checkLocalAuthStatus();
    }
}

/**
 * التحقق من حالة تسجيل الدخول المحلية
 * Check local authentication status
 */
function checkLocalAuthStatus() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // صفحات لا تتطلب تسجيل الدخول
    // Pages that don't require authentication
    const publicPages = ['login.html', 'signup.html'];
    
    // إذا كانت الصفحة الحالية ليست صفحة عامة وليس هناك تسجيل دخول، قم بالتوجيه إلى صفحة تسجيل الدخول
    // If current page is not public and user is not authenticated, redirect to login
    if (!publicPages.includes(currentPage) && !isAuthenticated) {
        // حفظ الصفحة الحالية للعودة إليها بعد تسجيل الدخول
        // Save current page to return after login
        localStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
        return;
    }
    
    // إذا كان المستخدم مسجل الدخول وهو على صفحة تسجيل الدخول أو التسجيل، قم بالتوجيه إلى الصفحة الرئيسية
    // If user is authenticated and on login or signup page, redirect to home
    if (publicPages.includes(currentPage) && isAuthenticated) {
        const redirectUrl = localStorage.getItem('redirectAfterLogin') || 'index.html';
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectUrl;
        return;
    }
    
    // إذا كان المستخدم مسجل الدخول، تحقق من صلاحيات الوصول للصفحة الحالية
    // If user is authenticated, check access permissions for current page
    if (isAuthenticated && !publicPages.includes(currentPage)) {
        const userRole = localStorage.getItem('userRole') || ROLES.INVENTORY_MANAGER;
        
        // التحقق من صلاحيات الوصول للصفحة الحالية
        // Check access permissions for current page
        if (!hasPageAccess(currentPage, userRole)) {
            // إذا لم يكن لدى المستخدم صلاحية الوصول، قم بالتوجيه إلى الصفحة الرئيسية
            // If user doesn't have access permission, redirect to home page
            alert('ليس لديك صلاحية الوصول إلى هذه الصفحة');
            window.location.href = 'index.html';
            return;
        }
        
        // تحديث واجهة المستخدم
        // Update UI
        const username = localStorage.getItem('username');
        updateAuthenticatedUI(username, userRole);
    }
}

/**
 * التحقق من صلاحية الوصول للصفحة
 * Check page access permission
 * @param {string} page - اسم الصفحة
 * @param {string} role - دور المستخدم
 * @returns {boolean} - ما إذا كان لدى المستخدم صلاحية الوصول
 */
function hasPageAccess(page, role) {
    // إذا لم تكن الصفحة موجودة في قائمة الصلاحيات، اسمح بالوصول افتراضيًا
    // If page is not in permissions list, allow access by default
    if (!PAGE_PERMISSIONS[page]) {
        return true;
    }
    
    // التحقق من وجود دور المستخدم في قائمة الأدوار المسموح لها بالوصول
    // Check if user role is in the list of roles allowed to access
    return PAGE_PERMISSIONS[page].includes(role);
}

/**
 * التحقق مما إذا كان المستخدم مديرًا
 * Check if user is admin
 * @returns {boolean} - ما إذا كان المستخدم مديرًا
 */
function isAdmin() {
    const userRole = localStorage.getItem('userRole');
    return userRole === ROLES.ADMIN;
}

/**
 * معالجة المستخدم المصادق عليه
 * Handle authenticated user
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @param {string} role - دور المستخدم
 */
function handleAuthenticatedUser(email, role) {
    // تخزين حالة المصادقة في localStorage للتوافق مع النظام القديم
    // Store authentication state in localStorage for compatibility with old system
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', email);
    localStorage.setItem('userRole', role || ROLES.INVENTORY_MANAGER);
    
    // تحديث واجهة المستخدم
    // Update UI
    updateAuthenticatedUI(email, role);
    
    // التحقق من الصفحة الحالية
    // Check current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['login.html', 'signup.html'];
    
    // إذا كان المستخدم على صفحة تسجيل الدخول أو التسجيل، قم بالتوجيه إلى الصفحة الرئيسية
    // If user is on login or signup page, redirect to home
    if (publicPages.includes(currentPage)) {
        const redirectUrl = localStorage.getItem('redirectAfterLogin') || 'index.html';
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectUrl;
        return;
    }
    
    // التحقق من صلاحيات الوصول للصفحة الحالية
    // Check access permissions for current page
    if (!hasPageAccess(currentPage, role)) {
        // إذا لم يكن لدى المستخدم صلاحية الوصول، قم بالتوجيه إلى الصفحة الرئيسية
        // If user doesn't have access permission, redirect to home page
        alert('ليس لديك صلاحية الوصول إلى هذه الصفحة');
        window.location.href = 'index.html';
    }
}

/**
 * تحديث واجهة المستخدم للمستخدمين المسجلين
 * Update UI for authenticated users
 * @param {string} username - اسم المستخدم أو البريد الإلكتروني
 * @param {string} role - دور المستخدم
 */
function updateAuthenticatedUI(username, role) {
    // إضافة عناصر واجهة المستخدم المسجل
    // Add authenticated user UI elements
    
    // إضافة قائمة المستخدم إلى شريط التنقل
    // Add user menu to navbar
    const navbarNav = document.getElementById('navbarNav');
    if (navbarNav) {
        // التحقق من عدم وجود قائمة المستخدم مسبقًا
        // Check if user menu doesn't already exist
        if (!document.getElementById('userDropdown')) {
            const userMenu = document.createElement('ul');
            userMenu.className = 'navbar-nav ms-auto';
            
            // تحديد نص الدور بناءً على قيمة الدور
            // Determine role text based on role value
            let roleText = 'مستخدم';
            let roleClass = 'text-secondary';
            
            switch(role) {
                case ROLES.ADMIN:
                    roleText = 'مدير النظام';
                    roleClass = 'text-danger';
                    break;
                case ROLES.INVENTORY_MANAGER:
                    roleText = 'مسؤول المخزن';
                    roleClass = 'text-primary';
                    break;
                case ROLES.PURCHASE_MANAGER:
                    roleText = 'مسؤول المشتريات';
                    roleClass = 'text-success';
                    break;
            }
            
            userMenu.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-user-circle me-1"></i> ${username}
                        <span class="badge rounded-pill ${roleClass} ms-1">${roleText}</span>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                        <li><a class="dropdown-item" href="#"><i class="fas fa-user-cog me-2"></i>الإعدادات</a></li>
                        ${role === ROLES.ADMIN ? '<li><a class="dropdown-item" href="users.html"><i class="fas fa-users-cog me-2"></i>إدارة المستخدمين</a></li>' : ''}
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i>تسجيل الخروج</a></li>
                    </ul>
                </li>
            `;
            navbarNav.appendChild(userMenu);
        }
    }
    
    // تحديث قائمة التنقل بناءً على دور المستخدم
    // Update navigation menu based on user role
    updateNavigationMenu(role);
}

/**
 * تحديث قائمة التنقل بناءً على دور المستخدم
 * Update navigation menu based on user role
 * @param {string} role - دور المستخدم
 */
function updateNavigationMenu(role) {
    // الحصول على عناصر القائمة
    // Get menu items
    const navItems = document.querySelectorAll('.navbar-nav:not(.ms-auto) .nav-item');
    
    // إذا لم تكن هناك عناصر قائمة، لا تفعل شيئًا
    // If there are no menu items, do nothing
    if (!navItems || navItems.length === 0) {
        return;
    }
    
    // تحديث ظهور عناصر القائمة بناءً على دور المستخدم
    // Update visibility of menu items based on user role
    navItems.forEach(item => {
        const link = item.querySelector('a.nav-link');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // استخراج اسم الصفحة من الرابط
        // Extract page name from link
        const page = href.split('/').pop();
        
        // التحقق من صلاحية الوصول للصفحة
        // Check access permission for page
        if (!hasPageAccess(page, role)) {
            // إخفاء عنصر القائمة إذا لم يكن لدى المستخدم صلاحية الوصول
            // Hide menu item if user doesn't have access permission
            item.style.display = 'none';
        } else {
            // إظهار عنصر القائمة إذا كان لدى المستخدم صلاحية الوصول
            // Show menu item if user has access permission
            item.style.display = '';
        }
    });
}

/**
 * تسجيل الدخول
 * Login function
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @param {boolean} rememberMe - تذكرني
 * @returns {Promise} - وعد بنتيجة تسجيل الدخول
 */
function login(email, password, rememberMe = false) {
    // محاولة تسجيل الدخول باستخدام Firebase إذا كان متاحًا
    // Try to login with Firebase if available
    if (typeof firebaseLogin === 'function' && firebaseInitialized) {
        return firebaseLogin(email, password)
            .then(userCredential => {
                // الحصول على دور المستخدم من Firebase
                // Get user role from Firebase
                return getUserRoleFromFirebase(userCredential.user.uid)
                    .then(role => {
                        // تخزين دور المستخدم في localStorage
                        // Store user role in localStorage
                        localStorage.setItem('userRole', role);
                        return { success: true, role };
                    });
            })
            .catch(error => {
                console.error("Firebase login error:", error);
                // استخدم تسجيل الدخول المحلي كبديل
                // Use local login as fallback
                if (loginLocal(email, password, rememberMe)) {
                    return { success: true, role: localStorage.getItem('userRole') || ROLES.INVENTORY_MANAGER };
                } else {
                    throw error;
                }
            });
    } else {
        // استخدم تسجيل الدخول المحلي
        // Use local login
        if (loginLocal(email, password, rememberMe)) {
            return Promise.resolve({ success: true, role: localStorage.getItem('userRole') || ROLES.INVENTORY_MANAGER });
        } else {
            return Promise.reject(new Error("Invalid credentials"));
        }
    }
}

/**
 * تسجيل الدخول المحلي
 * Local login function
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @param {boolean} rememberMe - تذكرني
 * @returns {boolean} - نجاح تسجيل الدخول
 */
function loginLocal(email, password, rememberMe = false) {
    // للتبسيط، سنقوم بمحاكاة نجاح تسجيل الدخول
    // For simplicity, we'll simulate successful login
    
    // التحقق من صحة بيانات الاعتماد (في تطبيق حقيقي، سيتم ذلك على الخادم)
    // Validate credentials (in a real app, this would be done on the server)
    if (email && password) {
        // محاولة استرداد بيانات المستخدم من localStorage
        // Try to retrieve user data from localStorage
        const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
        const userData = usersData[email];
        
        // إذا كان المستخدم موجودًا، تحقق من كلمة المرور
        // If user exists, check password
        if (userData && userData.password === password) {
            // تخزين حالة المصادقة في localStorage
            // Store authentication state in localStorage
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('username', email);
            localStorage.setItem('userRole', userData.role || ROLES.INVENTORY_MANAGER);
            
            // إذا تم تحديد "تذكرني"، قم بتعيين تاريخ انتهاء الصلاحية لمدة أطول
            // If "remember me" is checked, set a longer expiration
            if (rememberMe) {
                localStorage.setItem('authExpiration', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
            } else {
                // انتهاء الصلاحية بعد 24 ساعة
                // Expire after 24 hours
                localStorage.setItem('authExpiration', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            }
            
            return true;
        } else if (!userData) {
            // إذا كان هذا أول مستخدم، اعتبره مديرًا
            // If this is the first user, consider them an admin
            const isFirstUser = Object.keys(usersData).length === 0;
            
            // تخزين حالة المصادقة في localStorage
            // Store authentication state in localStorage
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('username', email);
            localStorage.setItem('userRole', isFirstUser ? ROLES.ADMIN : ROLES.INVENTORY_MANAGER);
            
            // إضافة المستخدم إلى localStorage
            // Add user to localStorage
            usersData[email] = {
                email,
                password,
                role: isFirstUser ? ROLES.ADMIN : ROLES.INVENTORY_MANAGER,
                firstName: '',
                lastName: ''
            };
            localStorage.setItem('usersData', JSON.stringify(usersData));
            
            // إذا تم تحديد "تذكرني"، قم بتعيين تاريخ انتهاء الصلاحية لمدة أطول
            // If "remember me" is checked, set a longer expiration
            if (rememberMe) {
                localStorage.setItem('authExpiration', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
            } else {
                // انتهاء الصلاحية بعد 24 ساعة
                // Expire after 24 hours
                localStorage.setItem('authExpiration', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            }
            
            return true;
        }
    }
    
    return false;
}

/**
 * تسجيل مستخدم جديد
 * Signup function
 * @param {object} userData - بيانات المستخدم
 * @returns {Promise} - وعد بنتيجة التسجيل
 */
function signup(userData) {
    // محاولة التسجيل باستخدام Firebase إذا كان متاحًا
    // Try to signup with Firebase if available
    if (typeof firebaseSignup === 'function' && firebaseInitialized) {
        return firebaseSignup(userData.email, userData.password, userData)
            .then(userCredential => {
                return { success: true, user: userCredential.user };
            })
            .catch(error => {
                console.error("Firebase signup error:", error);
                // استخدم التسجيل المحلي كبديل
                // Use local signup as fallback
                if (signupLocal(userData)) {
                    return { success: true };
                } else {
                    throw error;
                }
            });
    } else {
        // استخدم التسجيل المحلي
        // Use local signup
        if (signupLocal(userData)) {
            return Promise.resolve({ success: true });
        } else {
            return Promise.reject(new Error("Signup failed"));
        }
    }
}

/**
 * تسجيل مستخدم جديد محليًا
 * Local signup function
 * @param {object} userData - بيانات المستخدم
 * @returns {boolean} - نجاح التسجيل
 */
function signupLocal(userData) {
    if (!userData || !userData.email || !userData.password) {
        return false;
    }
    
    // استرداد بيانات المستخدمين من localStorage
    // Retrieve users data from localStorage
    const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
    
    // التحقق مما إذا كان البريد الإلكتروني مستخدمًا بالفعل
    // Check if email is already in use
    if (usersData[userData.email]) {
        return false;
    }
    
    // تحديد دور المستخدم
    // Determine user role
    const isFirstUser = Object.keys(usersData).length === 0;
    const userRole = isFirstUser ? ROLES.ADMIN : (userData.role || ROLES.INVENTORY_MANAGER);
    
    // إضافة المستخدم إلى localStorage
    // Add user to localStorage
    usersData[userData.email] = {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userRole
    };
    
    // حفظ بيانات المستخدمين في localStorage
    // Save users data to localStorage
    localStorage.setItem('usersData', JSON.stringify(usersData));
    
    // تسجيل الدخول تلقائيًا بعد التسجيل
    // Auto login after signup
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', userData.email);
    localStorage.setItem('userRole', userRole);
    
    return true;
}

/**
 * تسجيل الخروج
 * Logout function
 * @returns {Promise} - وعد بنتيجة تسجيل الخروج
 */
function logout() {
    // محاولة تسجيل الخروج من Firebase إذا كان متاحًا
    // Try to logout from Firebase if available
    if (typeof firebaseLogout === 'function' && firebaseInitialized) {
        return firebaseLogout()
            .then(() => {
                // تسجيل الخروج من localStorage أيضًا
                // Logout from localStorage as well
                logoutLocal();
                return { success: true };
            })
            .catch(error => {
                console.error("Firebase logout error:", error);
                // استخدم تسجيل الخروج المحلي كبديل
                // Use local logout as fallback
                logoutLocal();
                return { success: true };
            });
    } else {
        // استخدم تسجيل الخروج المحلي
        // Use local logout
        logoutLocal();
        return Promise.resolve({ success: true });
    }
}

/**
 * تسجيل الخروج المحلي
 * Local logout function
 */
function logoutLocal() {
    // إزالة بيانات المصادقة من localStorage
    // Remove authentication data from localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('authExpiration');
    
    // إعادة التوجيه إلى صفحة تسجيل الدخول
    // Redirect to login page
    window.location.href = 'login.html';
}

/**
 * إنشاء مستخدم جديد (للمدير فقط)
 * Create new user (admin only)
 * @param {object} userData - بيانات المستخدم
 * @returns {Promise} - وعد بنتيجة إنشاء المستخدم
 */
function createUser(userData) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("Only admin can create users"));
    }
    
    // محاولة إنشاء المستخدم في Firebase إذا كان متاحًا
    // Try to create user in Firebase if available
    if (typeof firebaseSignup === 'function' && firebaseInitialized) {
        return firebaseSignup(userData.email, userData.password, userData)
            .then(userCredential => {
                return { success: true, user: userCredential.user };
            })
            .catch(error => {
                console.error("Firebase create user error:", error);
                // استخدم الإنشاء المحلي كبديل
                // Use local creation as fallback
                if (createUserLocal(userData)) {
                    return { success: true };
                } else {
                    throw error;
                }
            });
    } else {
        // استخدم الإنشاء المحلي
        // Use local creation
        if (createUserLocal(userData)) {
            return Promise.resolve({ success: true });
        } else {
            return Promise.reject(new Error("User creation failed"));
        }
    }
}

/**
 * إنشاء مستخدم جديد محليًا (للمدير فقط)
 * Create new user locally (admin only)
 * @param {object} userData - بيانات المستخدم
 * @returns {boolean} - نجاح إنشاء المستخدم
 */
function createUserLocal(userData) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return false;
    }
    
    if (!userData || !userData.email || !userData.password) {
        return false;
    }
    
    // استرداد بيانات المستخدمين من localStorage
    // Retrieve users data from localStorage
    const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
    
    // التحقق مما إذا كان البريد الإلكتروني مستخدمًا بالفعل
    // Check if email is already in use
    if (usersData[userData.email]) {
        return false;
    }
    
    // إضافة المستخدم إلى localStorage
    // Add user to localStorage
    usersData[userData.email] = {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userData.role || ROLES.INVENTORY_MANAGER
    };
    
    // حفظ بيانات المستخدمين في localStorage
    // Save users data to localStorage
    localStorage.setItem('usersData', JSON.stringify(usersData));
    
    return true;
}

/**
 * تحديث بيانات المستخدم (للمدير فقط)
 * Update user data (admin only)
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @param {object} userData - بيانات المستخدم الجديدة
 * @returns {Promise} - وعد بنتيجة تحديث المستخدم
 */
function updateUser(email, userData) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("Only admin can update users"));
    }
    
    // محاولة تحديث المستخدم في Firebase إذا كان متاحًا
    // Try to update user in Firebase if available
    if (typeof updateDocument === 'function' && firebaseInitialized && db) {
        // البحث عن معرف المستخدم في Firebase
        // Search for user ID in Firebase
        return db.collection('users').where('email', '==', email).get()
            .then(querySnapshot => {
                if (querySnapshot.empty) {
                    throw new Error("User not found");
                }
                
                const userDoc = querySnapshot.docs[0];
                const userId = userDoc.id;
                
                // تحديث بيانات المستخدم
                // Update user data
                return updateDocument('users', userId, userData);
            })
            .then(() => {
                // تحديث البيانات المحلية أيضًا
                // Update local data as well
                updateUserLocal(email, userData);
                return { success: true };
            })
            .catch(error => {
                console.error("Firebase update user error:", error);
                // استخدم التحديث المحلي كبديل
                // Use local update as fallback
                if (updateUserLocal(email, userData)) {
                    return { success: true };
                } else {
                    throw error;
                }
            });
    } else {
        // استخدم التحديث المحلي
        // Use local update
        if (updateUserLocal(email, userData)) {
            return Promise.resolve({ success: true });
        } else {
            return Promise.reject(new Error("User update failed"));
        }
    }
}

/**
 * تحديث بيانات المستخدم محليًا (للمدير فقط)
 * Update user data locally (admin only)
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @param {object} userData - بيانات المستخدم الجديدة
 * @returns {boolean} - نجاح تحديث المستخدم
 */
function updateUserLocal(email, userData) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return false;
    }
    
    // استرداد بيانات المستخدمين من localStorage
    // Retrieve users data from localStorage
    const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
    
    // التحقق من وجود المستخدم
    // Check if user exists
    if (!usersData[email]) {
        return false;
    }
    
    // تحديث بيانات المستخدم
    // Update user data
    usersData[email] = {
        ...usersData[email],
        ...userData
    };
    
    // حفظ بيانات المستخدمين في localStorage
    // Save users data to localStorage
    localStorage.setItem('usersData', JSON.stringify(usersData));
    
    return true;
}

/**
 * حذف مستخدم (للمدير فقط)
 * Delete user (admin only)
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @returns {Promise} - وعد بنتيجة حذف المستخدم
 */
function deleteUser(email) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("Only admin can delete users"));
    }
    
    // محاولة حذف المستخدم من Firebase إذا كان متاحًا
    // Try to delete user from Firebase if available
    if (typeof deleteDocument === 'function' && firebaseInitialized && db) {
        // البحث عن معرف المستخدم في Firebase
        // Search for user ID in Firebase
        return db.collection('users').where('email', '==', email).get()
            .then(querySnapshot => {
                if (querySnapshot.empty) {
                    throw new Error("User not found");
                }
                
                const userDoc = querySnapshot.docs[0];
                const userId = userDoc.id;
                
                // حذف المستخدم
                // Delete user
                return deleteDocument('users', userId);
            })
            .then(() => {
                // حذف البيانات المحلية أيضًا
                // Delete local data as well
                deleteUserLocal(email);
                return { success: true };
            })
            .catch(error => {
                console.error("Firebase delete user error:", error);
                // استخدم الحذف المحلي كبديل
                // Use local delete as fallback
                if (deleteUserLocal(email)) {
                    return { success: true };
                } else {
                    throw error;
                }
            });
    } else {
        // استخدم الحذف المحلي
        // Use local delete
        if (deleteUserLocal(email)) {
            return Promise.resolve({ success: true });
        } else {
            return Promise.reject(new Error("User deletion failed"));
        }
    }
}

/**
 * حذف مستخدم محليًا (للمدير فقط)
 * Delete user locally (admin only)
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @returns {boolean} - نجاح حذف المستخدم
 */
function deleteUserLocal(email) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return false;
    }
    
    // استرداد بيانات المستخدمين من localStorage
    // Retrieve users data from localStorage
    const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
    
    // التحقق من وجود المستخدم
    // Check if user exists
    if (!usersData[email]) {
        return false;
    }
    
    // حذف المستخدم
    // Delete user
    delete usersData[email];
    
    // حفظ بيانات المستخدمين في localStorage
    // Save users data to localStorage
    localStorage.setItem('usersData', JSON.stringify(usersData));
    
    return true;
}

/**
 * الحصول على قائمة المستخدمين (للمدير فقط)
 * Get users list (admin only)
 * @returns {Promise<Array>} - وعد بقائمة المستخدمين
 */
function getUsers() {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("Only admin can view users"));
    }
    
    // محاولة الحصول على المستخدمين من Firebase إذا كان متاحًا
    // Try to get users from Firebase if available
    if (typeof getCollection === 'function' && firebaseInitialized && db) {
        return getCollection('users')
            .then(querySnapshot => {
                const users = [];
                querySnapshot.forEach(doc => {
                    const userData = doc.data();
                    users.push({
                        id: doc.id,
                        email: userData.email,
                        firstName: userData.firstName || '',
                        lastName: userData.lastName || '',
                        role: userData.role || ROLES.INVENTORY_MANAGER
                    });
                });
                return users;
            })
            .catch(error => {
                console.error("Firebase get users error:", error);
                // استخدم الحصول على المستخدمين المحلي كبديل
                // Use local get users as fallback
                return getUsersLocal();
            });
    } else {
        // استخدم الحصول على المستخدمين المحلي
        // Use local get users
        return Promise.resolve(getUsersLocal());
    }
}

/**
 * الحصول على قائمة المستخدمين محليًا (للمدير فقط)
 * Get users list locally (admin only)
 * @returns {Array} - قائمة المستخدمين
 */
function getUsersLocal() {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check if current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return [];
    }
    
    // استرداد بيانات المستخدمين من localStorage
    // Retrieve users data from localStorage
    const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
    
    // تحويل البيانات إلى مصفوفة
    // Convert data to array
    const users = [];
    for (const email in usersData) {
        const userData = usersData[email];
        users.push({
            email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: userData.role || ROLES.INVENTORY_MANAGER
        });
    }
    
    return users;
}
