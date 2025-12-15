"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>App crashed on this page.</h2>
      <pre style={{ whiteSpace: "pre-wrap", color: "#444" }}>
        {error?.message}
      </pre>
      <button onClick={() => reset()} style={{ padding: "10px 14px" }}>
        Reload page
      </button>
    </div>
  );
}
