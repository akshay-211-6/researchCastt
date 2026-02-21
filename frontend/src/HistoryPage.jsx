import { useState, useEffect } from "react";
import { addDocument, getUserDocuments, deleteDocument, updateDocument } from "./services/firestore";

export default function HistoryPage({ user, onBack }) {
    const [items, setItems] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            const data = await getUserDocuments("notes", user.uid);
            setItems(data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
        } catch (err) {
            console.error("Failed to load notes:", err);
        } finally {
            setFetching(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setLoading(true);
        try {
            const newItem = await addDocument("notes", {
                text: text.trim(),
                userId: user.uid,
                userEmail: user.email
            });
            setItems([newItem, ...items]);
            setText("");
        } catch (err) {
            alert("Error adding note: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        try {
            await deleteDocument("notes", id);
            setItems(items.filter(item => item.id !== id));
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    };

    const handleToggleStar = async (item) => {
        try {
            const updated = await updateDocument("notes", item.id, {
                starred: !item.starred
            });
            setItems(items.map(i => i.id === item.id ? { ...i, starred: !i.starred } : i));
        } catch (err) {
            alert("Error updating: " + err.message);
        }
    };

    return (
        <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", background: "var(--surface)", borderRadius: "16px", border: "1px solid var(--border)" }} className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}>My Research Notes</h2>
                <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 700 }}>← Back</button>
            </div>

            <form onSubmit={handleAdd} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="New note about a paper..."
                    style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg)" }}
                />
                <button disabled={loading} style={{ padding: "12px 20px", borderRadius: "10px", background: "var(--accent)", border: "none", fontWeight: 700, cursor: "pointer" }}>
                    {loading ? "..." : "Add"}
                </button>
            </form>

            {fetching ? (
                <p style={{ textAlign: "center", color: "var(--fg-muted)" }}>Loading your notes...</p>
            ) : items.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--fg-muted)" }}>No notes yet. Add your first one!</p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {items.map(item => (
                        <div key={item.id} style={{ padding: "16px", borderRadius: "12px", background: "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ color: "var(--fg)", fontSize: "15px" }}>{item.text}</p>
                                <p style={{ color: "var(--fg-muted)", fontSize: "11px", marginTop: "4px" }}>{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                            </div>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button onClick={() => handleToggleStar(item)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}>
                                    {item.starred ? "⭐" : "☆"}
                                </button>
                                <button onClick={() => handleDelete(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p style={{ color: "var(--fg-muted)", fontSize: "10px", marginTop: "30px", textAlign: "center", fontStyle: "italic" }}>
                Note: Firestore rules are currently in Test Mode. Ensure you secure them with userId checks before production.
            </p>
        </div>
    );
}
