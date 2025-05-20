/**
 * تكوين Firebase لنظام إدارة المخزون - اسكندويتش
 * Firebase Configuration for Eskandawitch Inventory Management
 */

// تعريف الأدوار المتاحة في النظام
// Define available roles in the system
const ROLES = {
    ADMIN: 'admin',
    INVENTORY_MANAGER: 'inventory_manager',
    PURCHASE_MANAGER: 'purchase_manager'
};

// تهيئة Firebase
// Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// التحقق من وجود تكوين Firebase صحيح
// Check if Firebase config is valid
function isValidFirebaseConfig() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         firebaseConfig.authDomain !== "YOUR_PROJECT_ID.firebaseapp.com" &&
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

// متغير للتحقق من حالة Firebase
// Variable to check Firebase status
let firebaseInitialized = false;

// محاولة تهيئة Firebase فقط إذا كان التكوين صحيحًا
// Try to initialize Firebase only if config is valid
try {
  if (isValidFirebaseConfig()) {
    firebase.initializeApp(firebaseConfig);
    firebaseInitialized = true;
    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase configuration is not set. Using local authentication as fallback.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// الحصول على مراجع للخدمات المستخدمة إذا تم تهيئة Firebase
// Get references to used services if Firebase is initialized
let auth = null;
let db = null;

if (firebaseInitialized) {
  auth = firebase.auth();
  db = firebase.firestore();
}

/**
 * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
 * Sign in with email and password
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @returns {Promise} - وعد بنتيجة تسجيل الدخول
 */
function firebaseLogin(email, password) {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  return auth.signInWithEmailAndPassword(email, password);
}

/**
 * إنشاء حساب جديد باستخدام البريد الإلكتروني وكلمة المرور
 * Create a new account with email and password
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @param {object} userData - بيانات المستخدم الإضافية
 * @returns {Promise} - وعد بنتيجة إنشاء الحساب
 */
function firebaseSignup(email, password, userData) {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  return auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // إضافة بيانات المستخدم إلى Firestore
      // Add user data to Firestore
      return db.collection('users').doc(userCredential.user.uid).set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username || userData.email,
        email: userData.email,
        role: userData.role || ROLES.INVENTORY_MANAGER,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
}

/**
 * تسجيل الخروج
 * Sign out
 * @returns {Promise} - وعد بنتيجة تسجيل الخروج
 */
function firebaseLogout() {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  return auth.signOut();
}

/**
 * الحصول على المستخدم الحالي
 * Get current user
 * @returns {object|null} - كائن المستخدم الحالي أو null إذا لم يكن هناك مستخدم مسجل الدخول
 */
function getCurrentUser() {
  if (!firebaseInitialized) {
    return null;
  }
  return auth.currentUser;
}

/**
 * الاستماع لتغييرات حالة المصادقة
 * Listen for authentication state changes
 * @param {function} callback - دالة رد الاتصال التي سيتم استدعاؤها عند تغيير حالة المصادقة
 * @returns {function} - دالة لإلغاء الاشتراك
 */
function onAuthStateChanged(callback) {
  if (!firebaseInitialized) {
    // استدعاء رد الاتصال مع null لتوضيح أن المستخدم غير مسجل الدخول
    // Call callback with null to indicate user is not logged in
    setTimeout(() => callback(null), 0);
    return () => {}; // دالة فارغة لإلغاء الاشتراك - Empty unsubscribe function
  }
  return auth.onAuthStateChanged(callback);
}

/**
 * إضافة مستند إلى مجموعة
 * Add a document to a collection
 * @param {string} collection - اسم المجموعة
 * @param {object} data - بيانات المستند
 * @returns {Promise} - وعد بنتيجة الإضافة
 */
function addDocument(collection, data) {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  return db.collection(collection).add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * تحديث مستند في مجموعة
 * Update a document in a collection
 * @param {string} collection - اسم المجموعة
 * @param {string} docId - معرف المستند
 * @param {object} data - بيانات التحديث
 * @returns {Promise} - وعد بنتيجة التحديث
 */
function updateDocument(collection, docId, data) {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  return db.collection(collection).doc(docId).update({
    ...data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * حذف مستند من مجموعة
 * Delete a document from a collection
 * @param {string} collection - اسم المجموعة
 * @param {string} docId - معرف المستند
 * @returns {Promise} - وعد بنتيجة الحذف
 */
function deleteDocument(collection, docId) {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  return db.collection(collection).doc(docId).delete();
}

/**
 * الحصول على مستند من مجموعة
 * Get a document from a collection
 * @param {string} collection - اسم المجموعة
 * @param {string} docId - معرف المستند
 * @returns {Promise} - وعد بالمستند
 */
function getDocument(collection, docId) {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  return db.collection(collection).doc(docId).get();
}

/**
 * الحصول على جميع المستندات في مجموعة
 * Get all documents in a collection
 * @param {string} collection - اسم المجموعة
 * @returns {Promise} - وعد بالمستندات
 */
function getCollection(collection) {
  if (!firebaseInitialized) {
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  return db.collection(collection).get();
}

/**
 * الاستماع للتغييرات في مستند
 * Listen for changes in a document
 * @param {string} collection - اسم المجموعة
 * @param {string} docId - معرف المستند
 * @param {function} callback - دالة رد الاتصال التي سيتم استدعاؤها عند تغيير المستند
 * @returns {function} - دالة لإلغاء الاشتراك
 */
function onDocumentChange(collection, docId, callback) {
  if (!firebaseInitialized) {
    return () => {}; // دالة فارغة لإلغاء الاشتراك - Empty unsubscribe function
  }
  return db.collection(collection).doc(docId).onSnapshot(callback);
}

/**
 * الاستماع للتغييرات في مجموعة
 * Listen for changes in a collection
 * @param {string} collection - اسم المجموعة
 * @param {function} callback - دالة رد الاتصال التي سيتم استدعاؤها عند تغيير المجموعة
 * @returns {function} - دالة لإلغاء الاشتراك
 */
function onCollectionChange(collection, callback) {
  if (!firebaseInitialized) {
    return () => {}; // دالة فارغة لإلغاء الاشتراك - Empty unsubscribe function
  }
  return db.collection(collection).onSnapshot(callback);
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
      if (doc.exists && doc.data().role) {
        return doc.data().role;
      } else {
        return ROLES.INVENTORY_MANAGER; // دور افتراضي - Default role
      }
    });
}
