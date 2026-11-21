import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = { title: "TURF PRO — Pronostics hippiques", description: "Analyses et pronostics hippiques avec validation éditoriale." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body><Header />{children}<footer><div className="container">TURF PRO — plateforme d’analyse hippique. Aucun pari, aucune prise de mises. Paiement de démonstration uniquement.</div></footer></body></html>}
