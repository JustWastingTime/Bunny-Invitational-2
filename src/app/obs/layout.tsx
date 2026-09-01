import { Fredoka, Nunito } from "next/font/google";
import "./obs.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-obs-ui",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-obs-display",
});

export default function ObsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${nunito.variable} ${fredoka.variable} h-[1080px] w-[1920px] overflow-hidden bg-transparent`}>
      {children}
    </div>
  );
}
