import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "#f7f4ec",
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[0, 1].map((row) => (
            <div key={row} style={{ display: "flex", gap: 8 }}>
              {[0, 1].map((column) => (
                <div
                  key={column}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 7,
                    background:
                      row === 1 && column === 1 ? "#fba907" : "#0b2e1f",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
