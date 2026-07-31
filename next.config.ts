import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // identity-credentials-get: Google One Tap / FedCM
            value:
              "camera=(), microphone=(), geolocation=(), identity-credentials-get=(self \"https://accounts.google.com\")",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Google One Tap / Identity Services
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "img-src 'self' data: blob: https: https://*.googleusercontent.com",
              "font-src 'self' data:",
              "connect-src 'self' https: wss: https://accounts.google.com",
              "frame-src 'self' https://accounts.google.com https://apis.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
