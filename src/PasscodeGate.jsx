import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { FAMILY_PASSCODE } from "./firebase.js";

const SESSION_KEY = "family-tree-unlocked";

export default function PasscodeGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // از sessionStorage استفاده می‌کنیم تا با هر بار باز کردن مرورگر دوباره رمز نخواد
    // (این فقط محلیه، نه چیزی که در artifact ممنوع باشه - این یک سایت واقعی است)
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved === "true") setUnlocked(true);
    setChecked(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === FAMILY_PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!checked) return null;
  if (unlocked) return children;

  return (
    <div style={styles.wrap} dir="rtl">
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <Lock size={22} color="#8B5A6B" />
        </div>
        <h1 style={styles.title}>شجره‌نامه خانواده</h1>
        <p style={styles.subtitle}>برای ورود، رمز خانواده را وارد کن</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="رمز"
            style={styles.input}
            autoFocus
          />
          {error && <span style={styles.error}>رمز اشتباه است</span>}
          <button type="submit" style={styles.btn}>
            ورود
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    background: "#FAF6EF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Vazirmatn', sans-serif",
    padding: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 18,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 360,
    textAlign: "center",
    boxShadow: "0 8px 30px rgba(43,42,40,0.1)",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#F3E2D9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  title: {
    fontFamily: "'Lora', serif",
    fontSize: 20,
    margin: 0,
    color: "#3A2E26",
  },
  subtitle: {
    fontSize: 13,
    color: "#9c9183",
    margin: "8px 0 20px",
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1.5px solid #E5DDD0",
    fontSize: 15,
    outline: "none",
    textAlign: "center",
    fontFamily: "'Vazirmatn', sans-serif",
  },
  error: { color: "#C1623D", fontSize: 12, fontWeight: 600 },
  btn: {
    padding: "12px 0",
    borderRadius: 10,
    border: "none",
    background: "#8B5A6B",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Vazirmatn', sans-serif",
  },
};
