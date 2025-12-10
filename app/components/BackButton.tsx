"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  function goBack() {
    // If history length > 1 → go back
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      onClick={goBack}
      className="eventura-button-secondary"
      style={{
        marginBottom: "1rem",
        display: "inline-flex",
        gap: "6px",
        alignItems: "center",
        padding: "8px 16px",
        borderRadius: "8px",
      }}
    >
      ← Back
    </button>
  );
}
