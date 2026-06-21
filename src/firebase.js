// تنظیمات Firebase
// این مقادیر را از کنسول Firebase خودت کپی کن (مرحله‌ی بعدی راهنما)
// Project Settings → General → Your apps → SDK setup and configuration

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvYf7ybHlmJZN0tPE7gXwMY0-gEg-84iI",
  authDomain: "tree-family-70852.firebaseapp.com",
  projectId: "tree-family-70852",
  storageBucket: "tree-family-70852.firebasestorage.app",
  messagingSenderId: "909072879392",
  appId: "1:909072879392:web:2be8f406b89acb01569145",
};

// رمز ساده‌ای که بین اعضای خانواده رد و بدل می‌شه
// این را به دلخواه عوض کن، همه باید همین رمز را وارد کنند تا درخت را ببینند
export const FAMILY_PASSCODE = "ourfamily2026";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
