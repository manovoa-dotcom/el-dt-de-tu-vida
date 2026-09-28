type Props = {
  alias: string;
  photoUrl?: string | null;
  size?: number;
  ringColor?: string;
};

export default function Avatar({
  alias,
  photoUrl,
  size = 36,
  ringColor,
}: Props) {
  const inicial = alias.trim().charAt(0).toUpperCase() || "?";
  const inner = Math.max(14, Math.round(size * 0.42));

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: photoUrl ? "transparent" : "rgba(255,255,255,0.08)",
        color: "var(--gold)",
        fontWeight: 700,
        fontSize: inner,
        border: ringColor ? `1.5px solid ${ringColor}` : "1.5px dashed rgba(255,255,255,0.2)",
        lineHeight: 1,
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={alias}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        inicial
      )}
    </div>
  );
}