export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{
            borderColor: "var(--gold)",
            borderTopColor: "transparent",
          }}
        />
        <p className="text-xs" style={{ color: "var(--dim)" }}>
          Cargando...
        </p>
      </div>
    </div>
  );
}
