import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import AntdRegistry from "@/lib/AntdRegistry";
import { ConfigProvider, App } from "antd";
import esES from "antd/locale/es_ES";

const inter = Inter({ subsets: ["latin"] });
export const playfair = Playfair_Display({ 
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Posada Marinelys - Gestión de Reservas",
  description: "Sistema integral de gestión de reservas y pagos para Posada Marinelys",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} ${playfair.variable}`}>
        <AntdRegistry>
          <ConfigProvider
            locale={esES}
          theme={{
              token: {
                colorPrimary: "#1e3a8b",
                borderRadius: 12,
                fontFamily: inter.style.fontFamily,
                colorBgLayout: "transparent",
                colorBgContainer: "rgba(255,255,255,0.80)",
              },
              components: {
                Layout: {
                  colorBgLayout: "transparent",
                  headerBg: "transparent",
                  siderBg: "transparent",
                },
                Button: {
                  colorPrimary: "#1e3a8b",
                  colorPrimaryHover: "#1d4ed9",
                  borderRadius: 10,
                },
                Input: {
                  borderRadius: 10,
                },
                Card: {
                  borderRadius: 20,
                  colorBgContainer: "rgba(255,255,255,0.80)",
                },
                Menu: {
                  itemBg: "transparent",
                  colorActiveBarBorderSize: 0,
                },
              },
            }}
          >
            <App>
              {children}
            </App>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
