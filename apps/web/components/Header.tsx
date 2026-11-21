import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";

export default async function Header() {
  const user = await getSessionUser();
  let vipActive = false;
  if (user) {
    const vip = await prisma.entitlement.findFirst({
      where: { userId: user.id, product: { in: ["VIP_24H", "VIP_7D"] }, expiresAt: { gt: new Date() } },
    });
    vipActive = Boolean(vip);
  }

  return (
    <header className="topbar">
      <div className="container nav">
        <Link className="brand" href="/">
          TURF PRO
        </Link>
        <nav className="navlinks">
          <Link href="/programme">Programme</Link>
          <Link href="/mon-compte">Mon compte</Link>
          {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "EDITOR") && (
            <Link href="/admin">Back-Office</Link>
          )}
          {user ? (
            <>
              <span className="pill">{vipActive ? "VIP actif" : user.role}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/connexion">Connexion</Link>
              <Link href="/inscription">Inscription</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
