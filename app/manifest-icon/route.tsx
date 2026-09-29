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
          alignItems: "center",
          justifyContent: "center",
          background: "#08190f",
          backgroundImage:
            "radial-gradient(circle at 30% 20%, #1b4f39 0%, #08190f 70%)",
        }}
      >
        <div
          style={{
            width: 340,
            height: 340,
            borderRadius: "50%",
            border: "10px solid #f2b632",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 190,
              fontWeight: 900,
              color: "#f2b632",
              letterSpacing: -10,
              lineHeight: 1,
              display: "flex",
            }}
          >
            DT
          </div>
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}