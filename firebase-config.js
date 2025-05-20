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
  apiKey: "AIzaSyDZNXBqNPQKJqUEBTXFCW3SnK6911A0_W4",
  authDomain: "isk4-2d639.firebaseapp.com",
  projectId: "isk4-2d639",
  storageBucket: "isk4-2d639.firebasestorage.app",
  messagingSenderId: "688884670994",
  appId: "1:688884670994:web:98edacc1464f82cbafeecb",
  measurementId: "G-R5086JJVLC"
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
let auth = null;
let db = null;

// محاولة تهيئة Firebase فقط إذا كان التكوين صحيحًا
// Try to initialize Firebase only if config is valid
try {
  if (isValidFirebaseConfig()) {
    // تهيئة Firebase
    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    } else {
      firebase.app(); // إذا كان التطبيق مهيأ بالفعل
    }
    
    firebaseInitialized = true;
    console.log("Firebase initialized successfully");
    
    // الحصول على مراجع للخدمات المستخدمة
    // Get references to used services
    auth = firebase.auth();
    db = firebase.firestore();
    
    // تكوين Firestore
    // Configure Firestore
    db.settings({
      ignoreUndefinedProperties: true,
      merge: true
    });
    
    console.log("Firestore initialized successfully");
  } else {
    console.warn("Firebase configuration is not set. Using local authentication as fallback.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

/**
 * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
 * Sign in with email and password
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 * @returns {Promise} - وعد بنتيجة تسجيل الدخول
 */
function firebaseLogin(email, password) {
  console.log("Attempting Firebase login for:", email);
  
  if (!firebaseInitialized || !auth) {
    console.error("Firebase auth not initialized");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  return auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      console.log("Login successful for user:", userCredential.user.uid);
      return userCredential;
    })
    .catch(error => {
      console.error("Login error:", error.code, error.message);
      throw error;
    });
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
  console.log("Starting firebaseSignup with:", email, "userData:", userData);
  
  if (!firebaseInitialized || !auth || !db) {
    console.error("Firebase not initialized properly:", { firebaseInitialized, auth: !!auth, db: !!db });
    return Promise.reject(new Error("Firebase is not configured properly. Please update firebase-config.js with your Firebase credentials."));
  }
  
  // إنشاء المستخدم في Firebase Authentication
  // Create user in Firebase Authentication
  return auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      console.log("User created in Auth:", userCredential.user.uid);
      
      // تحضير بيانات المستخدم للتخزين
      // Prepare user data for storage
      const userDataToStore = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        username: userData.username || email,
        email: email,
        role: userData.role || ROLES.INVENTORY_MANAGER,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      console.log("Saving user data to Firestore:", userDataToStore);
      
      // حفظ بيانات المستخدم في Firestore
      // Save user data to Firestore
      return db.collection('users').doc(userCredential.user.uid).set(userDataToStore)
        .then(() => {
          console.log("User data saved to Firestore successfully");
          return userCredential;
        })
        .catch((error) => {
          console.error("Error saving user data to Firestore:", error);
          // حتى لو فشل حفظ البيانات في Firestore، نعيد بيانات المستخدم من Auth
          // Even if Firestore save fails, return the Auth user
          return userCredential;
        });
    })
    .catch(error => {
      console.error("Signup error:", error.code, error.message);
      throw error;
    });
}

/**
 * تسجيل الخروج
 * Sign out
 * @returns {Promise} - وعد بنتيجة تسجيل الخروج
 */
function firebaseLogout() {
  if (!firebaseInitialized || !auth) {
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
  if (!firebaseInitialized || !auth) {
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
  if (!firebaseInitialized || !auth) {
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
  console.log(`Adding document to ${collection}:`, data);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for addDocument");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  // إضافة طابع زمني للإنشاء
  // Add creation timestamp
  const dataWithTimestamp = {
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  return db.collection(collection).add(dataWithTimestamp)
    .then(docRef => {
      console.log(`Document added to ${collection} with ID:`, docRef.id);
      return docRef;
    })
    .catch(error => {
      console.error(`Error adding document to ${collection}:`, error);
      throw error;
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
  console.log(`Updating document in ${collection} with ID ${docId}:`, data);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for updateDocument");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  // إضافة طابع زمني للتحديث
  // Add update timestamp
  const dataWithTimestamp = {
    ...data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  return db.collection(collection).doc(docId).update(dataWithTimestamp)
    .then(() => {
      console.log(`Document ${docId} in ${collection} updated successfully`);
      return { success: true, docId };
    })
    .catch(error => {
      console.error(`Error updating document ${docId} in ${collection}:`, error);
      throw error;
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
  console.log(`Deleting document from ${collection} with ID:`, docId);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for deleteDocument");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  return db.collection(collection).doc(docId).delete()
    .then(() => {
      console.log(`Document ${docId} in ${collection} deleted successfully`);
      return { success: true, docId };
    })
    .catch(error => {
      console.error(`Error deleting document ${docId} in ${collection}:`, error);
      throw error;
    });
}

/**
 * الحصول على مستند من مجموعة
 * Get a document from a collection
 * @param {string} collection - اسم المجموعة
 * @param {string} docId - معرف المستند
 * @returns {Promise} - وعد بالمستند
 */
function getDocument(collection, docId) {
  console.log(`Getting document from ${collection} with ID:`, docId);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for getDocument");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  return db.collection(collection).doc(docId).get()
    .then(doc => {
      if (doc.exists) {
        console.log(`Document ${docId} in ${collection} retrieved successfully`);
      } else {
        console.log(`Document ${docId} in ${collection} does not exist`);
      }
      return doc;
    })
    .catch(error => {
      console.error(`Error getting document ${docId} from ${collection}:`, error);
      throw error;
    });
}

/**
 * الحصول على جميع المستندات في مجموعة
 * Get all documents in a collection
 * @param {string} collection - اسم المجموعة
 * @returns {Promise} - وعد بالمستندات
 */
function getCollection(collection) {
  console.log(`Getting all documents from ${collection}`);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for getCollection");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  return db.collection(collection).get()
    .then(querySnapshot => {
      console.log(`Retrieved ${querySnapshot.size} documents from ${collection}`);
      return querySnapshot;
    })
    .catch(error => {
      console.error(`Error getting documents from ${collection}:`, error);
      throw error;
    });
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
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for onDocumentChange");
    return () => {}; // دالة فارغة لإلغاء الاشتراك - Empty unsubscribe function
  }
  
  console.log(`Listening for changes in document ${docId} in ${collection}`);
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
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for onCollectionChange");
    return () => {}; // دالة فارغة لإلغاء الاشتراك - Empty unsubscribe function
  }
  
  console.log(`Listening for changes in collection ${collection}`);
  return db.collection(collection).onSnapshot(callback);
}

/**
 * الحصول على دور المستخدم من Firebase
 * Get user role from Firebase
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<string>} - وعد بدور المستخدم
 */
function getUserRoleFromFirebase(userId) {
  console.log("Getting user role for user ID:", userId);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for getUserRoleFromFirebase");
    return Promise.reject(new Error("Firebase is not initialized"));
  }
  
  return db.collection('users').doc(userId).get()
    .then(doc => {
      if (doc.exists && doc.data().role) {
        console.log(`User ${userId} has role:`, doc.data().role);
        return doc.data().role;
      } else {
        console.log(`User ${userId} has no role defined, using default role`);
        return ROLES.INVENTORY_MANAGER; // دور افتراضي - Default role
      }
    })
    .catch(error => {
      console.error("Error getting user role:", error);
      throw error;
    });
}

/**
 * إضافة مستند مع معرف مخصص
 * Add document with custom ID
 * @param {string} collection - اسم المجموعة
 * @param {string} docId - معرف المستند المخصص
 * @param {object} data - بيانات المستند
 * @returns {Promise} - وعد بنتيجة الإضافة
 */
function setDocument(collection, docId, data) {
  console.log(`Setting document in ${collection} with ID ${docId}:`, data);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for setDocument");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  // إضافة طابع زمني للإنشاء
  // Add creation timestamp
  const dataWithTimestamp = {
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  return db.collection(collection).doc(docId).set(dataWithTimestamp)
    .then(() => {
      console.log(`Document set in ${collection} with ID:`, docId);
      return { success: true, docId };
    })
    .catch(error => {
      console.error(`Error setting document in ${collection}:`, error);
      throw error;
    });
}

/**
 * إضافة مجموعة من المستندات دفعة واحدة
 * Add a batch of documents
 * @param {string} collection - اسم المجموعة
 * @param {Array<object>} dataArray - مصفوفة من بيانات المستندات
 * @returns {Promise} - وعد بنتيجة الإضافة
 */
function addBatchDocuments(collection, dataArray) {
  console.log(`Adding batch of ${dataArray.length} documents to ${collection}`);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for addBatchDocuments");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  const batch = db.batch();
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  
  dataArray.forEach(data => {
    const docRef = db.collection(collection).doc();
    batch.set(docRef, {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  });
  
  return batch.commit()
    .then(() => {
      console.log(`Batch of ${dataArray.length} documents added to ${collection} successfully`);
      return { success: true, count: dataArray.length };
    })
    .catch(error => {
      console.error(`Error adding batch of documents to ${collection}:`, error);
      throw error;
    });
}

/**
 * إضافة مجموعة من المستندات دفعة واحدة مع معرفات مخصصة
 * Add a batch of documents with custom IDs
 * @param {string} collection - اسم المجموعة
 * @param {Array<{id: string, data: object}>} items - مصفوفة من العناصر مع معرفات وبيانات
 * @returns {Promise} - وعد بنتيجة الإضافة
 */
function setBatchDocuments(collection, items) {
  console.log(`Setting batch of ${items.length} documents in ${collection}`);
  
  if (!firebaseInitialized || !db) {
    console.error("Firestore not initialized for setBatchDocuments");
    return Promise.reject(new Error("Firebase is not configured. Please update firebase-config.js with your Firebase credentials."));
  }
  
  const batch = db.batch();
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  
  items.forEach(item => {
    const docRef = db.collection(collection).doc(item.id.toString());
    batch.set(docRef, {
      ...item.data,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  });
  
  return batch.commit()
    .then(() => {
      console.log(`Batch of ${items.length} documents set in ${collection} successfully`);
      return { success: true, count: items.length };
    })
    .catch(error => {
      console.error(`Error setting batch of documents in ${collection}:`, error);
      throw error;
    });
}
