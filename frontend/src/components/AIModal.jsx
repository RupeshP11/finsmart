function AIModal({ open, onClose, content }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          background: "#1f2937",
          padding: "20px",
          borderRadius: "8px",
          width: "400px",
          maxWidth: "90%",
        }}
      >
        <h3 style={{ marginTop: 0 }}>FinSmart AI</h3>

        <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
          {content}
        </p>

        <button
          onClick={onClose}
          style={{
            marginTop: "12px",
            padding: "6px 12px",
            border: "none",
            background: "#222",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default AIModal;
