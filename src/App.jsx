import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, X, User, Calendar, Users, AlertCircle, Loader2 } from "lucide-react";
import { db } from "./firebase.js";
import PasscodeGate from "./PasscodeGate.jsx";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

// ---------- Generation color palette (cycles every 5 generations) ----------
const GEN_COLORS = [
  { bg: "#C1623D", soft: "#F3E2D9", name: "Terracotta" },
  { bg: "#5B7C99", soft: "#DEE7ED", name: "Dusty Blue" },
  { bg: "#7A8B69", soft: "#E5E9DD", name: "Sage" },
  { bg: "#D4A24C", soft: "#F5E8D3", name: "Ochre" },
  { bg: "#8B5A6B", soft: "#EBDDE1", name: "Plum" },
];
const getGenColor = (gen) => GEN_COLORS[((gen % GEN_COLORS.length) + GEN_COLORS.length) % GEN_COLORS.length];

const GENDER_LABEL = { m: "مرد", f: "زن", o: "نامشخص" };

const uid = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const formatDate = (d) => d || "";

const PEOPLE_COLLECTION = "people";

export default function App() {
  return (
    <PasscodeGate>
      <FamilyTree />
    </PasscodeGate>
  );
}

function FamilyTree() {
  const [people, setPeople] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addParentHint, setAddParentHint] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ---------- Live sync from Firestore ----------
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, PEOPLE_COLLECTION),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPeople(list);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError("اتصال به دیتابیس برقرار نشد. تنظیمات Firebase را بررسی کن.");
        setPeople([]);
      }
    );
    return () => unsub();
  }, []);

  const byId = useMemo(() => new Map((people || []).map((p) => [p.id, p])), [people]);

  // ---------- Generations ----------
  const generationOf = useMemo(() => {
    const map = new Map();
    if (!people) return map;
    const lookup = new Map(people.map((p) => [p.id, p]));
    const visit = (id, stack = new Set()) => {
      if (map.has(id)) return map.get(id);
      if (stack.has(id)) return 0;
      stack.add(id);
      const p = lookup.get(id);
      if (!p) return 0;
      const parentIds = [p.parent1, p.parent2].filter(Boolean).filter((pid) => lookup.has(pid));
      if (parentIds.length === 0) {
        map.set(id, 0);
        return 0;
      }
      const g = Math.max(...parentIds.map((pid) => visit(pid, stack))) + 1;
      map.set(id, g);
      return g;
    };
    people.forEach((p) => visit(p.id));
    return map;
  }, [people]);

  const generations = useMemo(() => {
    if (!people) return [];
    const groups = new Map();
    people.forEach((p) => {
      const g = generationOf.get(p.id) ?? 0;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    });
    groups.forEach((arr) =>
      arr.sort((a, b) => (a.birthDate || "").localeCompare(b.birthDate || "") || a.name.localeCompare(b.name))
    );
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([gen, members]) => ({ gen, members }));
  }, [people, generationOf]);

  // ---------- Mutations (write directly to Firestore) ----------
  const addPerson = async (data) => {
    const id = uid();
    const newPerson = {
      name: data.name.trim(),
      birthDate: data.birthDate.trim(),
      gender: data.gender,
      parent1: data.parent1 || null,
      parent2: data.parent2 || null,
    };
    setSaving(true);
    try {
      await setDoc(doc(db, PEOPLE_COLLECTION, id), newPerson);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("ذخیره‌سازی انجام نشد. اتصال اینترنت یا تنظیمات Firebase را بررسی کن.");
    } finally {
      setSaving(false);
      setAddOpen(false);
      setAddParentHint(null);
    }
  };

  const deletePerson = async (id) => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, PEOPLE_COLLECTION, id));
      (people || []).forEach((p) => {
        if (p.parent1 === id || p.parent2 === id) {
          batch.set(
            doc(db, PEOPLE_COLLECTION, p.id),
            {
              ...p,
              parent1: p.parent1 === id ? null : p.parent1,
              parent2: p.parent2 === id ? null : p.parent2,
            },
            { merge: true }
          );
        }
      });
      await batch.commit();
      setError(null);
    } catch (e) {
      console.error(e);
      setError("حذف انجام نشد. دوباره تلاش کن.");
    } finally {
      setSaving(false);
      setSelected(null);
      setConfirmDeleteId(null);
    }
  };

  if (people === null) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 className="spin" size={28} color="#8B5A6B" />
        <p style={{ fontFamily: "'Lora', serif", color: "#6b6258", marginTop: 12 }}>در حال بارگذاری شجره‌نامه...</p>
        <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = people.length === 0;

  return (
    <div style={styles.page} dir="rtl">
      <style>{GLOBAL_CSS}</style>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>شجره‌نامه</h1>
          <p style={styles.subtitle}>{isEmpty ? "هنوز هیچ‌کس اضافه نشده" : `${people.length} نفر · ${generations.length} نسل`}</p>
        </div>
        <button
          style={styles.addBtn}
          onClick={() => {
            setAddParentHint(null);
            setAddOpen(true);
          }}
        >
          <Plus size={18} />
          <span>افزودن عضو</span>
        </button>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {saving && <div style={styles.savingPill}>در حال ذخیره...</div>}

      <div style={styles.sharedNotice}>این درخت به‌صورت زنده با همه‌ی اعضای خانواده هماهنگ می‌شود — هر تغییری فوراً برای همه نمایش داده می‌شود.</div>

      <div style={styles.canvasWrap}>
        {isEmpty ? (
          <EmptyState
            onAdd={() => {
              setAddParentHint(null);
              setAddOpen(true);
            }}
          />
        ) : (
          <TreeCanvas
            generations={generations}
            byId={byId}
            onSelect={setSelected}
            onAddChildOf={(id) => {
              setAddParentHint(id);
              setAddOpen(true);
            }}
          />
        )}
      </div>

      {addOpen && (
        <AddPersonModal
          people={people}
          initialParent={addParentHint}
          onClose={() => {
            setAddOpen(false);
            setAddParentHint(null);
          }}
          onSubmit={addPerson}
        />
      )}

      {selected && byId.has(selected) && (
        <DetailPanel
          person={byId.get(selected)}
          parents={[byId.get(byId.get(selected).parent1), byId.get(byId.get(selected).parent2)].filter(Boolean)}
          children={people.filter((p) => p.parent1 === selected || p.parent2 === selected)}
          gen={generationOf.get(selected) ?? 0}
          onClose={() => setSelected(null)}
          onDelete={() => setConfirmDeleteId(selected)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDeleteModal
          person={byId.get(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => deletePerson(confirmDeleteId)}
        />
      )}
    </div>
  );
}

// ============================================================
// Tree Canvas
// ============================================================
function TreeCanvas({ generations, byId, onSelect, onAddChildOf }) {
  const nodeRefs = useRef({});
  const wrapRef = useRef(null);
  const [paths, setPaths] = useState([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const recompute = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const newPaths = [];

    generations.forEach(({ members }) => {
      members.forEach((p) => {
        const childEl = nodeRefs.current[p.id];
        if (!childEl) return;
        const childRect = childEl.getBoundingClientRect();
        const cx = childRect.left + childRect.width / 2 - wrapRect.left;
        const cy = childRect.top - wrapRect.top;

        const parentIds = [p.parent1, p.parent2].filter((pid) => pid && byId.has(pid));
        if (parentIds.length === 0) return;

        const parentPoints = parentIds
          .map((pid) => nodeRefs.current[pid])
          .filter(Boolean)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2 - wrapRect.left, y: r.bottom - wrapRect.top };
          });
        if (parentPoints.length === 0) return;

        const originX = parentPoints.reduce((s, p2) => s + p2.x, 0) / parentPoints.length;
        const originY = Math.max(...parentPoints.map((p2) => p2.y));
        const midY = (originY + cy) / 2;
        const d = `M ${originX} ${originY} C ${originX} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
        newPaths.push({ d, key: `${parentIds.join("-")}_${p.id}` });

        if (parentPoints.length === 2) {
          const [a, b] = parentPoints.sort((x, y) => x.x - y.x);
          newPaths.push({ d: `M ${a.x} ${a.y - 1} L ${b.x} ${b.y - 1}`, key: `union_${parentIds.join("-")}`, isUnion: true });
        }
      });
    });

    setPaths(newPaths);
    setSize({ w: wrap.scrollWidth, h: wrap.scrollHeight });
  }, [generations, byId]);

  useEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", recompute);
    const t = setTimeout(recompute, 50);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      clearTimeout(t);
    };
  }, [recompute]);

  return (
    <div style={styles.treeScroll}>
      <div style={styles.treeInner} ref={wrapRef}>
        <svg style={{ position: "absolute", top: 0, left: 0, width: size.w || "100%", height: size.h || "100%", pointerEvents: "none" }}>
          {paths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill="none"
              stroke={p.isUnion ? "#B8AD9C" : "#C9BFAF"}
              strokeWidth={p.isUnion ? 2 : 1.6}
              strokeLinecap="round"
              opacity={p.isUnion ? 0.6 : 0.55}
            />
          ))}
        </svg>

        {generations.map(({ gen, members }) => (
          <div key={gen} style={styles.genRow}>
            <div style={styles.genLabel}>
              <span style={{ ...styles.genDot, background: getGenColor(gen).bg }} />
              نسل {gen + 1}
            </div>
            <div style={styles.genMembers}>
              {members.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  gen={gen}
                  innerRef={(el) => (nodeRefs.current[p.id] = el)}
                  onClick={() => onSelect(p.id)}
                  onAddChild={() => onAddChildOf(p.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonCard({ person, gen, innerRef, onClick, onAddChild }) {
  const color = getGenColor(gen);
  return (
    <div style={styles.cardWrap}>
      <button ref={innerRef} style={{ ...styles.card, borderColor: color.bg, background: color.soft }} onClick={onClick} className="card">
        <span style={{ ...styles.cardAvatar, background: color.bg }}>{person.gender === "f" ? "♀" : person.gender === "m" ? "♂" : "•"}</span>
        <span style={styles.cardName}>{person.name}</span>
        {person.birthDate && <span style={styles.cardDate}>{formatDate(person.birthDate)}</span>}
      </button>
      <button style={{ ...styles.miniAdd, borderColor: color.bg, color: color.bg }} onClick={onAddChild} title="افزودن فرزند">
        <Plus size={12} />
      </button>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div style={styles.emptyWrap}>
      <div style={styles.emptyGlyph}>🌳</div>
      <h2 style={styles.emptyTitle}>درخت خانواده‌ات را بکار</h2>
      <p style={styles.emptyText}>با اولین عضو شروع کن — می‌تواند قدیمی‌ترین جدّ شناخته‌شده یا خودت باشی. بقیه را بعداً به‌عنوان فرزند یا والد اضافه می‌کنی.</p>
      <button style={styles.addBtn} onClick={onAdd}>
        <Plus size={18} />
        <span>اولین عضو را اضافه کن</span>
      </button>
    </div>
  );
}

// ============================================================
// Add Person Modal
// ============================================================
function AddPersonModal({ people, initialParent, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("o");
  const [parent1, setParent1] = useState(initialParent || "");
  const [parent2, setParent2] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameValid = name.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!nameValid || submitting) return;
    setSubmitting(true);
    await onSubmit({ name, birthDate, gender, parent1: parent1 || null, parent2: parent2 || null });
    setSubmitting(false);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()} dir="rtl">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>افزودن عضو خانواده</h2>
          <button style={styles.iconBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            نام و نام خانوادگی
            <div style={styles.inputRow}>
              <User size={16} color="#9c9183" />
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: مریم احمدی" autoFocus />
            </div>
            {touched && !nameValid && <span style={styles.fieldError}>نام را وارد کن</span>}
          </label>

          <label style={styles.label}>
            تاریخ تولد
            <div style={styles.inputRow}>
              <Calendar size={16} color="#9c9183" />
              <input style={styles.input} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="مثلاً: ۱۳۶۵/۰۴/۱۲ یا 1986" />
            </div>
          </label>

          <label style={styles.label}>
            جنسیت
            <div style={styles.genderRow}>
              {[
                { v: "f", label: "زن" },
                { v: "m", label: "مرد" },
                { v: "o", label: "نامشخص" },
              ].map((g) => (
                <button
                  type="button"
                  key={g.v}
                  onClick={() => setGender(g.v)}
                  style={{ ...styles.genderBtn, ...(gender === g.v ? styles.genderBtnActive : {}) }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </label>

          <label style={styles.label}>
            والد ۱ (اختیاری)
            <div style={styles.inputRow}>
              <Users size={16} color="#9c9183" />
              <select style={styles.select} value={parent1} onChange={(e) => setParent1(e.target.value)}>
                <option value="">— هیچکدام —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === parent2}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          {parent1 && (
            <label style={styles.label}>
              والد ۲ (اختیاری)
              <div style={styles.inputRow}>
                <Users size={16} color="#9c9183" />
                <select style={styles.select} value={parent2} onChange={(e) => setParent2(e.target.value)}>
                  <option value="">— هیچکدام —</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === parent1}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}

          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              انصراف
            </button>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? "..." : "افزودن"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Detail Panel
// ============================================================
function DetailPanel({ person, parents, children, gen, onClose, onDelete }) {
  const color = getGenColor(gen);
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()} dir="rtl">
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...styles.cardAvatar, background: color.bg, width: 36, height: 36, fontSize: 16 }}>
              {person.gender === "f" ? "♀" : person.gender === "m" ? "♂" : "•"}
            </span>
            <h2 style={styles.modalTitle}>{person.name}</h2>
          </div>
          <button style={styles.iconBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.detailBody}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>تاریخ تولد</span>
            <span style={styles.detailValue}>{person.birthDate || "—"}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>جنسیت</span>
            <span style={styles.detailValue}>{GENDER_LABEL[person.gender]}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>نسل</span>
            <span style={styles.detailValue}>نسل {gen + 1}</span>
          </div>
          {parents.length > 0 && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>والدین</span>
              <span style={styles.detailValue}>{parents.map((p) => p.name).join(" و ")}</span>
            </div>
          )}
          {children.length > 0 && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>فرزندان</span>
              <span style={styles.detailValue}>{children.map((c) => c.name).join("، ")}</span>
            </div>
          )}
        </div>

        <div style={styles.modalActions}>
          <button style={styles.deleteBtn} onClick={onDelete}>
            حذف این عضو
          </button>
          <button style={styles.submitBtn} onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ person, onCancel, onConfirm }) {
  return (
    <div style={{ ...styles.modalOverlay, zIndex: 60 }} onClick={onCancel}>
      <div style={{ ...styles.modalCard, maxWidth: 380 }} onClick={(e) => e.stopPropagation()} dir="rtl">
        <h2 style={styles.modalTitle}>حذف {person?.name}؟</h2>
        <p style={{ color: "#6b6258", fontFamily: "'Vazirmatn', sans-serif", fontSize: 14, lineHeight: 1.8, margin: "12px 0 20px" }}>
          این عضو از درخت حذف می‌شود. فرزندان او در درخت می‌مانند اما رابطه‌شان با این فرد قطع می‌شود. این کار قابل بازگشت نیست.
        </p>
        <div style={styles.modalActions}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            انصراف
          </button>
          <button style={styles.deleteBtnSolid} onClick={onConfirm}>
            حذف کن
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Styles
// ============================================================
const styles = {
  page: { minHeight: "100vh", background: "#FAF6EF", fontFamily: "'Vazirmatn', sans-serif", color: "#2B2A28", display: "flex", flexDirection: "column" },
  loadingWrap: { minHeight: "100vh", background: "#FAF6EF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 12px", gap: 12, flexWrap: "wrap" },
  title: { fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 600, margin: 0, color: "#3A2E26" },
  subtitle: { fontSize: 13, color: "#9c9183", margin: "4px 0 0" },
  addBtn: { display: "flex", alignItems: "center", gap: 6, background: "#8B5A6B", color: "#FAF6EF", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Vazirmatn', sans-serif", boxShadow: "0 2px 8px rgba(139,90,107,0.25)" },
  errorBanner: { display: "flex", alignItems: "center", gap: 8, background: "#F3E2D9", color: "#9A4A2C", margin: "0 20px", padding: "10px 14px", borderRadius: 10, fontSize: 13 },
  savingPill: { position: "fixed", bottom: 16, left: 16, background: "#2B2A28", color: "#FAF6EF", padding: "6px 14px", borderRadius: 20, fontSize: 12, opacity: 0.85, zIndex: 50 },
  sharedNotice: { margin: "8px 20px 4px", fontSize: 12, color: "#9c9183", background: "#F1ECE1", padding: "8px 12px", borderRadius: 8 },
  canvasWrap: { flex: 1, position: "relative", overflow: "hidden" },
  treeScroll: { width: "100%", height: "100%", overflow: "auto", padding: "30px 20px 60px" },
  treeInner: { position: "relative", minWidth: "fit-content", display: "flex", flexDirection: "column", gap: 56 },
  genRow: { display: "flex", flexDirection: "column", gap: 10, position: "relative", zIndex: 1 },
  genLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#9c9183", fontWeight: 600, letterSpacing: 0.3 },
  genDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  genMembers: { display: "flex", gap: 28, flexWrap: "nowrap" },
  cardWrap: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center" },
  card: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 120, padding: "14px 16px 12px", borderRadius: 14, border: "2px solid", cursor: "pointer", fontFamily: "'Vazirmatn', sans-serif", boxShadow: "0 2px 6px rgba(43,42,40,0.06)", transition: "transform 0.15s ease" },
  cardAvatar: { width: 28, height: 28, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 },
  cardName: { fontFamily: "'Lora', serif", fontWeight: 600, fontSize: 14, color: "#2B2A28", textAlign: "center" },
  cardDate: { fontSize: 11, color: "#7a7163" },
  miniAdd: { marginTop: 4, width: 20, height: 20, borderRadius: "50%", border: "1.5px solid", background: "#FAF6EF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  emptyWrap: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40, gap: 4 },
  emptyGlyph: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontFamily: "'Lora', serif", fontSize: 22, margin: 0, color: "#3A2E26" },
  emptyText: { fontSize: 14, color: "#9c9183", maxWidth: 360, lineHeight: 1.8, margin: "8px 0 20px" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(43,42,40,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 },
  modalCard: { background: "#FAF6EF", borderRadius: 18, padding: 24, width: "100%", maxWidth: 440, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(43,42,40,0.25)" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  modalTitle: { fontFamily: "'Lora', serif", fontSize: 20, fontWeight: 600, margin: 0, color: "#3A2E26" },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#9c9183", padding: 4 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#6b6258", fontWeight: 600 },
  inputRow: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #E5DDD0", borderRadius: 10, padding: "10px 12px" },
  input: { border: "none", outline: "none", background: "transparent", fontSize: 14, flex: 1, fontFamily: "'Vazirmatn', sans-serif", color: "#2B2A28" },
  select: { border: "none", outline: "none", background: "transparent", fontSize: 14, flex: 1, fontFamily: "'Vazirmatn', sans-serif", color: "#2B2A28" },
  fieldError: { color: "#C1623D", fontWeight: 500, fontSize: 12 },
  genderRow: { display: "flex", gap: 8 },
  genderBtn: { flex: 1, padding: "9px 0", borderRadius: 8, border: "1.5px solid #E5DDD0", background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "'Vazirmatn', sans-serif", color: "#6b6258", fontWeight: 600 },
  genderBtnActive: { background: "#8B5A6B", borderColor: "#8B5A6B", color: "#fff" },
  modalActions: { display: "flex", gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #E5DDD0", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#6b6258", fontFamily: "'Vazirmatn', sans-serif" },
  submitBtn: { flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#8B5A6B", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'Vazirmatn', sans-serif" },
  deleteBtn: { flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #C1623D", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#C1623D", fontFamily: "'Vazirmatn', sans-serif" },
  deleteBtnSolid: { flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#C1623D", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'Vazirmatn', sans-serif" },
  detailBody: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 },
  detailRow: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 },
  detailLabel: { color: "#9c9183", fontWeight: 600, flexShrink: 0 },
  detailValue: { color: "#2B2A28", textAlign: "left" },
};

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; margin: 0; }
body { margin: 0; }
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid #8B5A6B;
  outline-offset: 2px;
}
.card:hover { transform: translateY(-2px); }
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
`;
