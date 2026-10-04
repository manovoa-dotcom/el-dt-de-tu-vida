export default function LoadingConvocatoria() {
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
          height: 160,
        }}
      />
      <div
        className="animate-pulse rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.05)",
          height: 100,
        }}
      />
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-2xl p-3"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div
            className="h-10 w-10 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div className="flex-1">
            <div
              className="h-4 w-24 rounded"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <div
              className="mt-2 h-3 w-16 rounded"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}