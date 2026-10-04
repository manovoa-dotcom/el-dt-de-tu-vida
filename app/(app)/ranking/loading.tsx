export default function LoadingRanking() {
  return (
    <div className="mx-3 mt-3 space-y-3">
      <div
        className="h-8 w-40 animate-pulse rounded-lg"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      <div
        className="h-10 animate-pulse rounded-xl"
        style={{ background: "rgba(255,255,255,0.05)" }}
      />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 px-1 py-2"
        >
          <div
            className="h-4 w-4 rounded"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="h-10 w-10 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="h-4 flex-1 rounded"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <div
            className="h-5 w-10 rounded"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
        </div>
      ))}
    </div>
  );
}
