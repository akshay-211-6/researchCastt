import { auth } from "./firebase.js";

// The base URL matching your main.py FastAPI configuration
const BASE = "http://localhost:8000/api";

// Unified fetch wrapper with auth
async function authenticatedFetch(url, options = {}) {
  const user = auth.currentUser;
  const headers = {
    ...options.headers,
  };

  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // If backend returns 401, it means the token is invalid or expired
    window.dispatchEvent(new Event("auth-error"));
  }
  return res;
}

export async function uploadPDF(file, voicePair = "FM") {
  const form = new FormData();
  form.append("file", file);
  form.append("voice_pair", voicePair);

  const res = await authenticatedFetch(`${BASE}/ingest`, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server returned status ${res.status}`);
  }
  return res.json();
}

export async function startGeneration(jobId) {
  const res = await authenticatedFetch(`${BASE}/generate/${jobId}`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to start generation");
  }
  return res.json();
}

export async function pollStatus(jobId) {
  const res = await authenticatedFetch(`${BASE}/generate/${jobId}/status`);
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export async function sendChat(jobId, message, history) {
  const res = await authenticatedFetch(`${BASE}/podcast/${jobId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

export async function submitQuiz(jobId, answers) {
  const res = await authenticatedFetch(`${BASE}/podcast/${jobId}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error("Failed to submit quiz");
  return res.json();
}

export async function getStudyGuide(jobId) {
  const res = await authenticatedFetch(`${BASE}/podcast/${jobId}/study-guide`);
  if (!res.ok) throw new Error("Failed to load study guide");
  return res.json();
}

export async function getLeaderboard() {
  const res = await authenticatedFetch(`${BASE}/podcast/leaderboard`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

// Helper functions for media URLs
// Note: These URLs are unprotected direct links in the current implementation.
// If the backend requires auth for these, they would need to be handled via fetch or signed URLs.
export function audioUrl(jobId) { return `${BASE}/podcast/${jobId}/audio`; }
export function captionsUrl(jobId) { return `${BASE}/podcast/${jobId}/captions`; }
export function downloadUrl(jobId) { return `${BASE}/podcast/${jobId}/download`; }
