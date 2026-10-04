export default function LoadingResultados() {
  return (
    <div className="mx-3 mt-3 space-y-3">
      <div
        className="h-8 w-40 animate-pulse rounded-lg"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      <div
        className="animate-pulse rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.05)",
          height: 70,
        }}
      />
      <div
        className="animate-pulse rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.05)",
          height: 200,
        }}
      />
      <div
        className="animate-pulse rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.05)",
          height: 300,
        }}
      />
    </div>
  );
}