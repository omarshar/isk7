/**
 * نظام المصادقة لنظام إدارة المخزون - اسكندويتش
 * Authentication System for Eskandawitch Inventory Management
 */

// تعريف الأدوار المتاحة في النظام
// Define available roles in the system
const ROLES = {
    ADMIN: 'admin',
    INVENTORY_MANAGER: 'inventory_manager',
    PURCHASE_MANAGER: 'purchase_manager'
};

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
                        console.log(`Successfully retrieved role: ${role} for user: ${user.email}`);
                        handleAuthenticatedUser(user.email, role);
                    })
                    .catch(error => {
                        console.error("Error getting user role from Firebase:", error);
                        // محاولة استرداد الدور من localStorage إذا كان موجودًا قبل استخدام الدور الافتراضي
                        // Try to retrieve role from localStorage if exists before using default role
                        const storedRole = localStorage.getItem('userRole');
                        if (storedRole && Object.values(ROLES).includes(storedRole)) {
                            console.log(`Using stored role from localStorage: ${storedRole} for user: ${user.email}`);
                            handleAuthenticatedUser(user.email, storedRole);
                        } else {
                            console.warn(`Using default role for user: ${user.email} due to Firebase error`);
                            handleAuthenticatedUser(user.email, ROLES.INVENTORY_MANAGER); // دور افتراضي - Default role
                        }
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
 * الحصول على دور المستخدم من Firebase
 * Get user role from Firebase
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<string>} - وعد بدور المستخدم
 */
function getUserRoleFromFirebase(userId) {
    if (!firebaseInitialized || !db) {
        return Promise.reject(new Error("Firebase is not initialized"));
    }
    
    return db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                // التحقق من وجود حقل الدور في بيانات المستخدم
                // Check if role field exists in user data
                const userData = doc.data();
                if (userData && userData.role) {
                    console.log(`Retrieved role from Firebase: ${userData.role} for user: ${userId}`);
                    return userData.role;
                } else {
                    console.warn(`Role not found in user data for user: ${userId}, using default role`);
                    return ROLES.INVENTORY_MANAGER; // دور افتراضي فقط إذا لم يكن هناك دور محدد - Default role only if no role specified
                }
            } else {
                console.warn(`User document not found for user: ${userId}, using default role`);
                return ROLES.INVENTORY_MANAGER; // دور افتراضي إذا لم يكن هناك وثيقة مستخدم - Default role if no user document
            }
        });
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
 * معالجة المستخدم المصادق عليه
 * Handle authenticated user
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @param {string} role - دور المستخدم
 */
function handleAuthenticatedUser(email, role) {
    // التأكد من أن الدور صالح، واستخدام الدور الافتراضي فقط إذا كان الدور غير محدد
    // Ensure role is valid, use default role only if role is undefined
    const validRole = role && Object.values(ROLES).includes(role) ? role : ROLES.INVENTORY_MANAGER;
    
    console.log(`Setting authenticated user: ${email} with role: ${validRole}`);
    
    // تخزين حالة المصادقة في localStorage للتوافق مع النظام القديم
    // Store authentication state in localStorage for compatibility with old system
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', email);
    localStorage.setItem('userRole', validRole);
    
    // تحديث واجهة المستخدم
    // Update UI
    updateAuthenticatedUI(email, validRole);
    
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
    if (!hasPageAccess(currentPage, validRole)) {
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
            
            // تخزين بيانات المستخدم
            // Store user data
            usersData[email] = {
                email,
                password,
                role: isFirstUser ? ROLES.ADMIN : ROLES.INVENTORY_MANAGER
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
 * إنشاء حساب جديد
 * Signup function
 * @param {object} userData - بيانات المستخدم
 * @param {string} role - دور المستخدم (اختياري، الافتراضي هو مسؤول المخزن)
 * @returns {Promise} - وعد بنتيجة إنشاء الحساب
 */
function signup(userData, role = ROLES.INVENTORY_MANAGER) {
    // محاولة إنشاء حساب باستخدام Firebase إذا كان متاحًا
    // Try to signup with Firebase if available
    if (typeof firebaseSignup === 'function' && firebaseInitialized) {
        // إضافة الدور إلى بيانات المستخدم
        // Add role to user data
        const userDataWithRole = { ...userData, role };
        
        return firebaseSignup(userData.email, userData.password, userDataWithRole)
            .then(() => {
                return { success: true, role };
            })
            .catch(error => {
                console.error("Firebase signup error:", error);
                // استخدم التسجيل المحلي كبديل
                // Use local signup as fallback
                if (signupLocal(userData, role)) {
                    return { success: true, role };
                } else {
                    throw error;
                }
            });
    } else {
        // استخدم التسجيل المحلي
        // Use local signup
        if (signupLocal(userData, role)) {
            return Promise.resolve({ success: true, role });
        } else {
            return Promise.reject(new Error("Signup failed"));
        }
    }
}

/**
 * إنشاء حساب جديد محلي
 * Local signup function
 * @param {object} userData - بيانات المستخدم
 * @param {string} role - دور المستخدم
 * @returns {boolean} - نجاح إنشاء الحساب
 */
function signupLocal(userData, role = ROLES.INVENTORY_MANAGER) {
    // للتبسيط، سنقوم بمحاكاة نجاح إنشاء الحساب
    // For simplicity, we'll simulate successful signup
    
    if (userData && userData.email && userData.password) {
        // الحصول على بيانات المستخدمين الحالية
        // Get current users data
        const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
        
        // التحقق مما إذا كان هذا أول مستخدم (سيكون مديرًا)
        // Check if this is the first user (will be admin)
        const isFirstUser = Object.keys(usersData).length === 0;
        const userRole = isFirstUser ? ROLES.ADMIN : role;
        
        // تخزين بيانات المستخدم
        // Store user data
        usersData[userData.email] = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: userData.password, // في تطبيق حقيقي، سيتم تشفير كلمة المرور
            role: userRole,
            createdAt: new Date().toISOString()
        };
        
        // حفظ بيانات المستخدمين
        // Save users data
        localStorage.setItem('usersData', JSON.stringify(usersData));
        
        // تخزين حالة المصادقة في localStorage
        // Store authentication state in localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', userData.email);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userData', JSON.stringify({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            role: userRole
        }));
        
        // انتهاء الصلاحية بعد 24 ساعة
        // Expire after 24 hours
        localStorage.setItem('authExpiration', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
        
        return true;
    }
    
    return false;
}

/**
 * إنشاء مستخدم جديد (للمدير فقط)
 * Create new user (admin only)
 * @param {object} userData - بيانات المستخدم
 * @param {string} role - دور المستخدم
 * @returns {Promise} - وعد بنتيجة إنشاء المستخدم
 */
function createUser(userData, role) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check that current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("ليس لديك صلاحية لإنشاء مستخدمين جدد"));
    }
    
    // إنشاء المستخدم باستخدام دالة التسجيل
    // Create user using signup function
    return signup(userData, role);
}

/**
 * تحديث بيانات مستخدم (للمدير فقط)
 * Update user data (admin only)
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @param {object} updatedData - البيانات المحدثة
 * @returns {Promise} - وعد بنتيجة تحديث المستخدم
 */
function updateUser(email, updatedData) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check that current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("ليس لديك صلاحية لتحديث بيانات المستخدمين"));
    }
    
    // تحديث بيانات المستخدم في Firebase إذا كان متاحًا
    // Update user data in Firebase if available
    if (firebaseInitialized && db) {
        // البحث عن المستخدم في Firestore
        // Search for user in Firestore
        return db.collection('users').where('email', '==', email).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    throw new Error("المستخدم غير موجود");
                }
                
                // تحديث بيانات المستخدم
                // Update user data
                const doc = snapshot.docs[0];
                return doc.ref.update(updatedData);
            });
    } else {
        // تحديث بيانات المستخدم في localStorage
        // Update user data in localStorage
        const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
        
        if (!usersData[email]) {
            return Promise.reject(new Error("المستخدم غير موجود"));
        }
        
        // تحديث بيانات المستخدم
        // Update user data
        usersData[email] = { ...usersData[email], ...updatedData };
        
        // حفظ بيانات المستخدمين
        // Save users data
        localStorage.setItem('usersData', JSON.stringify(usersData));
        
        return Promise.resolve({ success: true });
    }
}

/**
 * حذف مستخدم (للمدير فقط)
 * Delete user (admin only)
 * @param {string} email - البريد الإلكتروني للمستخدم
 * @returns {Promise} - وعد بنتيجة حذف المستخدم
 */
function deleteUser(email) {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check that current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("ليس لديك صلاحية لحذف المستخدمين"));
    }
    
    // التحقق من أن المستخدم لا يحاول حذف نفسه
    // Check that user is not trying to delete themselves
    const currentUserEmail = localStorage.getItem('username');
    if (currentUserEmail === email) {
        return Promise.reject(new Error("لا يمكنك حذف حسابك الخاص"));
    }
    
    // حذف المستخدم من Firebase إذا كان متاحًا
    // Delete user from Firebase if available
    if (firebaseInitialized && db) {
        // البحث عن المستخدم في Firestore
        // Search for user in Firestore
        return db.collection('users').where('email', '==', email).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    throw new Error("المستخدم غير موجود");
                }
                
                // حذف المستخدم
                // Delete user
                const doc = snapshot.docs[0];
                return doc.ref.delete();
            });
    } else {
        // حذف المستخدم من localStorage
        // Delete user from localStorage
        const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
        
        if (!usersData[email]) {
            return Promise.reject(new Error("المستخدم غير موجود"));
        }
        
        // حذف المستخدم
        // Delete user
        delete usersData[email];
        
        // حفظ بيانات المستخدمين
        // Save users data
        localStorage.setItem('usersData', JSON.stringify(usersData));
        
        return Promise.resolve({ success: true });
    }
}

/**
 * الحصول على قائمة المستخدمين (للمدير فقط)
 * Get users list (admin only)
 * @returns {Promise<Array>} - وعد بقائمة المستخدمين
 */
function getUsers() {
    // التحقق من أن المستخدم الحالي هو مدير
    // Check that current user is admin
    const currentUserRole = localStorage.getItem('userRole');
    if (currentUserRole !== ROLES.ADMIN) {
        return Promise.reject(new Error("ليس لديك صلاحية للوصول إلى قائمة المستخدمين"));
    }
    
    // الحصول على قائمة المستخدمين من Firebase إذا كان متاحًا
    // Get users list from Firebase if available
    if (firebaseInitialized && db) {
        return db.collection('users').get()
            .then(snapshot => {
                const users = [];
                snapshot.forEach(doc => {
                    const userData = doc.data();
                    // عدم تضمين كلمة المرور في البيانات المرسلة
                    // Don't include password in sent data
                    delete userData.password;
                    users.push({
                        id: doc.id,
                        ...userData
                    });
                });
                return users;
            });
    } else {
        // الحصول على قائمة المستخدمين من localStorage
        // Get users list from localStorage
        const usersData = JSON.parse(localStorage.getItem('usersData') || '{}');
        
        // تحويل كائن المستخدمين إلى مصفوفة
        // Convert users object to array
        const users = Object.keys(usersData).map(email => {
            const userData = { ...usersData[email] };
            // عدم تضمين كلمة المرور في البيانات المرسلة
            // Don't include password in sent data
            delete userData.password;
            return userData;
        });
        
        return Promise.resolve(users);
    }
}

/**
 * تسجيل الخروج
 * Logout function
 */
function logout() {
    // محاولة تسجيل الخروج من Firebase إذا كان متاحًا
    // Try to logout from Firebase if available
    if (typeof firebaseLogout === 'function' && firebaseInitialized) {
        firebaseLogout()
            .then(() => {
                // تم تسجيل الخروج بنجاح من Firebase
                // Successfully logged out from Firebase
                logoutLocal();
            })
            .catch((error) => {
                console.error("Firebase logout error:", error);
                // استخدم تسجيل الخروج المحلي كبديل
                // Use local logout as fallback
                logoutLocal();
            });
    } else {
        // استخدم تسجيل الخروج المحلي
        // Use local logout
        logoutLocal();
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
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('authExpiration');
    
    // إعادة التوجيه إلى صفحة تسجيل الدخول
    // Redirect to login page
    window.location.href = 'login.html';
}

/**
 * التحقق من صلاحية كلمة المرور
 * Validate password strength
 * @param {string} password - كلمة المرور للتحقق
 * @returns {boolean} - ما إذا كانت كلمة المرور قوية بما فيه الكفاية
 */
function validatePassword(password) {
    // على الأقل 8 أحرف
    // At least 8 characters
    const minLength = password.length >= 8;
    // على الأقل حرف كبير واحد
    // At least one uppercase letter
    const hasUppercase = /[A-Z]/.test(password);
    // على الأقل حرف صغير واحد
    // At least one lowercase letter
    const hasLowercase = /[a-z]/.test(password);
    // على الأقل رقم واحد
    // At least one number
    const hasNumber = /\d/.test(password);
    // على الأقل رمز خاص واحد
    // At least one special character
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

/**
 * التحقق من انتهاء صلاحية المصادقة
 * Check if authentication has expired
 * @returns {boolean} - ما إذا كانت المصادقة منتهية الصلاحية
 */
function isAuthExpired() {
    const expirationDate = localStorage.getItem('authExpiration');
    if (!expirationDate) {
        return true;
    }
    
    return new Date() > new Date(expirationDate);
}

/**
 * الحصول على دور المستخدم الحالي
 * Get current user role
 * @returns {string} - دور المستخدم الحالي
 */
function getCurrentUserRole() {
    return localStorage.getItem('userRole') || ROLES.INVENTORY_MANAGER;
}

/**
 * التحقق مما إذا كان المستخدم الحالي مديرًا
 * Check if current user is admin
 * @returns {boolean} - ما إذا كان المستخدم الحالي مديرًا
 */
function isAdmin() {
    return getCurrentUserRole() === ROLES.ADMIN;
}

/**
 * التحقق مما إذا كان المستخدم الحالي مسؤول مخزن
 * Check if current user is inventory manager
 * @returns {boolean} - ما إذا كان المستخدم الحالي مسؤول مخزن
 */
function isInventoryManager() {
    const role = getCurrentUserRole();
    return role === ROLES.INVENTORY_MANAGER || role === ROLES.ADMIN;
}

/**
 * التحقق مما إذا كان المستخدم الحالي مسؤول مشتريات
 * Check if current user is purchase manager
 * @returns {boolean} - ما إذا كان المستخدم الحالي مسؤول مشتريات
 */
function isPurchaseManager() {
    const role = getCurrentUserRole();
    return role === ROLES.PURCHASE_MANAGER || role === ROLES.ADMIN;
}

// التحقق من انتهاء صلاحية المصادقة بشكل دوري
// Periodically check if authentication has expired
setInterval(() => {
    if (localStorage.getItem('isAuthenticated') === 'true' && isAuthExpired()) {
        // تسجيل الخروج إذا انتهت صلاحية المصادقة
        // Logout if authentication has expired
        logout();
        alert('انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.');
    }
}, 60000); // التحقق كل دقيقة - Check every minute
