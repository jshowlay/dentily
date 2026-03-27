"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "2rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: "#475569", marginTop: "0.5rem" }}>{error.message || "Unexpected error."}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "1.5rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            borderRadius: "0.375rem",
            border: "1px solid #0f172a",
            background: "#0f172a",
            color: "#fff",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
