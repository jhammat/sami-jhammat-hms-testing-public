import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #7c3aed 100%)",
          borderRadius: "8px",
          color: "white",
          fontWeight: 900,
          fontSize: "20px",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-1px",
          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
        }}
      >
        W
      </div>
    ),
    {
      ...size,
    },
  );
}
