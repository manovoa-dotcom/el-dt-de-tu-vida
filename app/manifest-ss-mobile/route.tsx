import { ImageResponse } from "next/og";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#08190f",
          backgroundImage:
            "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)",
          padding: 48,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 400,
              color: "#f3f7f2",
              letterSpacing: 1,
              display: "flex",
            }}
          >
            Hola, Mariano
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#9fb8a8",
              marginTop: 8,
              display: "flex",
            }}
          >
            Fútbol Champagne · Fecha 5
          </div>
        </div>

        {/* Card partido */}
        <div
          style={{
            marginTop: 40,
            padding: 32,
            borderRadius: 24,
            background: "linear-gradient(160deg, #1b4f39, #11352a)",
            border: "2px solid #f2b632",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: "#f2b632",
              letterSpacing: 4,
              display: "flex",
            }}
          >
            PRÓXIMO PARTIDO · FECHA 5
          </div>
          <div
            style={{
              fontSize: 48,
              color: "#f3f7f2",
              marginTop: 12,
              display: "flex",
            }}
          >
            Sábado 18 · 20:00
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#9fb8a8",
              marginTop: 8,
              display: "flex",
            }}
          >
            📍 Cancha 1 · La Red
          </div>

          <div
            style={{
              marginTop: 24,
              height: 16,
              borderRadius: 8,
              background: "rgba(255,255,255,0.1)",
              display: "flex",
            }}
          >
            <div
              style={{
                width: "80%",
                height: "100%",
                borderRadius: 8,
                background: "#f2b632",
                display: "flex",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#9fb8a8",
              marginTop: 8,
              display: "flex",
            }}
          >
            8 de 10 anotados
          </div>

          <div
            style={{
              marginTop: 24,
              padding: 24,
              borderRadius: 18,
              background: "#ee5a2a",
              fontSize: 26,
              color: "#ffffff",
              fontWeight: 700,
              justifyContent: "center",
              display: "flex",
            }}
          >
            Anotarme
          </div>
        </div>

        {/* Título noticias */}
        <div
          style={{
            marginTop: 60,
            fontSize: 40,
            color: "#f3f7f2",
            letterSpacing: 2,
            display: "flex",
          }}
        >
          EL DT DE TU VIDA INFORMA
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#9fb8a8",
            marginTop: 8,
            display: "flex",
          }}
        >
          Novedades del grupo
        </div>
      </div>
    ),
    { width: 750, height: 1334 }
  );
}