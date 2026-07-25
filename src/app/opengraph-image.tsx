import { ImageResponse } from "next/og";

export const alt =
  "DataGrid — buy data, airtime and pay everyday bills in Nigeria";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const services = ["DATA", "AIRTIME", "ELECTRICITY", "CABLE"];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          overflow: "hidden",
          color: "#f7f4ec",
          background:
            "radial-gradient(circle at 88% 16%, rgba(251,169,7,.24), transparent 28%), linear-gradient(135deg, #0b2e1f 0%, #071f15 72%)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -104,
            bottom: -168,
            width: 520,
            height: 520,
            display: "flex",
            borderRadius: 999,
            background: "rgba(251,169,7,.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 92,
            top: 92,
            width: 268,
            height: 268,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            transform: "rotate(5deg)",
          }}
        >
          {[0, 1].map((row) => (
            <div key={row} style={{ display: "flex", gap: 18 }}>
              {[0, 1].map((column) => (
                <div
                  key={column}
                  style={{
                    width: 125,
                    height: 125,
                    display: "flex",
                    borderRadius: 20,
                    background:
                      row === 1 && column === 1
                        ? "#fba907"
                        : "rgba(247,244,236,.11)",
                    border:
                      row === 1 && column === 1
                        ? "0 solid transparent"
                        : "2px solid rgba(247,244,236,.16)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            padding: "64px 72px 58px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 54,
                height: 54,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {[0, 1].map((row) => (
                <div key={row} style={{ display: "flex", gap: 4 }}>
                  {[0, 1].map((column) => (
                    <div
                      key={column}
                      style={{
                        width: 25,
                        height: 25,
                        display: "flex",
                        borderRadius: 4,
                        background:
                          row === 1 && column === 1 ? "#fba907" : "#f7f4ec",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: -1,
              }}
            >
              DataGrid
            </div>
          </div>

          <div
            style={{
              width: 760,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#fba907",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 4,
              }}
            >
              NIGERIA&apos;S DIGITAL SERVICE GRID
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: -3,
              }}
            >
              Everyday essentials.
              <br />
              Delivered clearly.
            </div>
            <div
              style={{
                display: "flex",
                color: "rgba(247,244,236,.7)",
                fontSize: 25,
                lineHeight: 1.45,
              }}
            >
              Secure checkout, fast fulfilment and a receipt for every order.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              {services.map((service) => (
                <div
                  key={service}
                  style={{
                    display: "flex",
                    borderRadius: 999,
                    border: "1px solid rgba(247,244,236,.16)",
                    background: "rgba(247,244,236,.07)",
                    padding: "9px 14px",
                    color: "rgba(247,244,236,.76)",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                  }}
                >
                  {service}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                color: "#fba907",
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              datagrid-gilt.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
