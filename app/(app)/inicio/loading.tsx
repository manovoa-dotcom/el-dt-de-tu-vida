export default function LoadingInicio() {
  return (
    <div className="mx-3 mt-3 space-y-3">
      {/* Skeleton del header */}
      <div className="flex items-center gap-3 px-1">
        <div
          className="h-12 w-12 animate-pulse rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div className="flex-1">
          <div
            className="h-6 w-32 animate-pulse rounded-lg"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="mt-2 h-3 w-40 animate-pulse rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>
      </div>

      {/* Skeleton card partido */}
      <div
        className="animate-pulse rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.06)",
          height: 180,
        }}
      />

      {/* Skeleton noticias */}
      <div
        className="animate-pulse rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          height: 100,
        }}
      />
      <div
        className="animate-pulse rounded-2xl p-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          height: 80,
        }}
      />
    </div>
  );
}