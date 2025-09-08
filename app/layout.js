import { GoogleTagManager } from "@next/third-parties/google";
import { Inter } from "next/font/google";
import Toaster from "./components/helper/toaster";
import Footer from "./components/footer";
import ScrollToTop from "./components/helper/scroll-to-top";
import Navbar from "./components/navbar";
import "./css/card.scss";
import "./css/globals.scss";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "amnas — Software Engineer",
  description:
    "Software Engineer building reliable backends, scalable systems on AWS, and polished web/mobile apps. Experience across fintech, civic‑tech, and blockchain (Solana/Anchor).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen relative mx-auto px-6 sm:px-12 lg:max-w-[70rem] xl:max-w-[76rem] 2xl:max-w-[92rem] text-white">
          <Navbar />
          {children}
          <ScrollToTop />
        </main>
        <Footer />
        <Toaster />
      </body>
      <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM} />
    </html>
  );
}
