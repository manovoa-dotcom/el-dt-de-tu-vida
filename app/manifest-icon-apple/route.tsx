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
        }}
      >
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            border: "5px solid #f2b632",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: "#f2b632",
              letterSpacing: -4,
              lineHeight: 1,
              display: "flex",
            }}
          >
            DT
          </div>
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}