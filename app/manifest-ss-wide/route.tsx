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
          padding: 60,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 24,
              color: "#f2b632",
              letterSpacing: 8,
              display: "flex",
            }}
          >
            EL DT DE TU VIDA
          </div>
          <div
            style={{
              fontSize: 72,
              color: "#f3f7f2",
              marginTop: 12,
              display: "flex",
              maxWidth: 900,
            }}
          >
            El campeonato del grupo, todas las semanas.
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#9fb8a8",
              marginTop: 20,
              display: "flex",
              maxWidth: 800,
            }}
          >
            Armá tu equipo cada fecha, sumá puntos con tus jugadores y peleá el
            campeonato anual con tus amigos.
          </div>
        </div>

        <div
          style={{
            marginTop: 60,
            display: "flex",
            gap: 24,
          }}
        >
          {["Anotarse", "Armar equipo", "Cargar resultados", "Ranking"].map(
            (txt) => (
              <div
                key={txt}
                style={{
                  padding: "20px 32px",
                  borderRadius: 18,
                  background: "#11352a",
                  border: "2px solid #f2b632",
                  color: "#f2b632",
                  fontSize: 24,
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {txt}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}