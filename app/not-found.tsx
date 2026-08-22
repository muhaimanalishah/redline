import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        textAlign: "center",
        backgroundColor: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--sans)",
      }}
    >
      <h2
        style={{
          fontSize: "32px",
          fontWeight: 600,
          marginBottom: "12px",
          fontFamily: "var(--serif)",
        }}
      >
        404 — Document Not Found
      </h2>
      <p
        style={{
          color: "var(--ink-soft)",
          fontSize: "14px",
          maxWidth: "420px",
          marginBottom: "24px",
          lineHeight: 1.5,
        }}
      >
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        style={{
          padding: "10px 18px",
          fontSize: "14px",
          fontWeight: 500,
          borderRadius: "8px",
          backgroundColor: "var(--ink)",
          color: "var(--paper)",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        Back to Editor
      </Link>
    </main>
  );
}
