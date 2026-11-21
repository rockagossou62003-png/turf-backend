import { isFedaPayLiveConfigured } from "@/lib/fedapay";

export const dynamic = "force-dynamic";

const offers = [
  { name: "Accès gratuit", price: "0 FCFA", detail: "Deux chevaux et analyse publique." },
  { name: "Couplé", price: "500 FCFA", detail: "Par combinaison, de 1 à 20 combinaisons." },
  { name: "Trio désordre", price: "2 500 FCFA", detail: "Pronostic de trois chevaux sans ordre." },
  { name: "Trio ordre", price: "8 000 FCFA", detail: "Pronostic de trois chevaux dans l'ordre." },
  { name: "Quinté — 7 chevaux", price: "5 000 FCFA", detail: "Sélection de sept chevaux." },
  { name: "Pass VIP 24 h", price: "10 000 FCFA", detail: "Accès VIP temporaire pendant 24 heures." },
  { name: "Pass VIP 7 jours", price: "34 680 FCFA", detail: "Accès VIP temporaire pendant sept jours." },
];

export default function Home() {
  const paymentAvailable = isFedaPayLiveConfigured();

  return (
    <>
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/">TURF PRO</a>
          <nav className="navlinks">
            <a href="#offres">Nos formules</a>
            <a href="/admin">Back-Office</a>
            <a href="#fonctionnement">Fonctionnement</a>
          </nav>
        </div>
      </header>
      <main className="container">
        <section className="hero">
          <div className="eyebrow">France &amp; Europe · Analyse hippique</div>
          <h1>Des analyses hippiques structurées. Des pronostics contrôlés.</h1>
          <p className="muted" style={{ maxWidth: 700 }}>
            TURF PRO prépare et publie des pronostics à partir de données de courses vérifiées. Les propositions
            générées par l’IA restent soumises à validation avant publication.
          </p>
          <a className="btn" href="#offres">Découvrir les formules</a>
        </section>
        <section id="fonctionnement" className="grid">
          <article className="panel">
            <span className="pill">01 · Données</span>
            <h3>Courses vérifiées</h3>
            <p className="muted">
              Les courses et partants proviennent de sources autorisées. Les informations manquantes ne sont jamais
              inventées.
            </p>
          </article>
          <article className="panel">
            <span className="pill">02 · Analyse</span>
            <h3>Assistance IA</h3>
            <p className="muted">
              L’IA examine les éléments disponibles et documente les facteurs utilisés, les limites et les incertitudes.
            </p>
          </article>
          <article className="panel">
            <span className="pill">03 · Contrôle</span>
            <h3>Validation humaine</h3>
            <p className="muted">
              Un responsable examine chaque pronostic avant sa mise à disposition des abonnés.
            </p>
          </article>
        </section>
        <section id="offres">
          <div className="eyebrow">Tarification initiale</div>
          <h2>Nos formules</h2>
          <div className="grid">
            {offers.map((offer) => (
              <article className="panel" key={offer.name}>
                <h3>{offer.name}</h3>
                <div className="price">{offer.price}</div>
                <p className="muted">{offer.detail}</p>
                <span className="pill">
                  {paymentAvailable ? "Paiement via FedaPay" : "Paiement bientôt disponible"}
                </span>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Transparence avant tout</h2>
          <p className="muted">
            TURF PRO vend un accès à des contenus d’analyse et de pronostics. La plateforme ne reçoit pas de mises, ne
            réalise pas de paris et ne garantit aucun gain.{" "}
            {paymentAvailable
              ? "Les paiements sont traités par FedaPay ; l’accès est accordé après confirmation du webhook."
              : "Les paiements seront activés après configuration d’un compte FedaPay Live et de son webhook."}
          </p>
        </section>
      </main>
      <footer>
        <div className="container">
          © {new Date().getFullYear()} TURF PRO · Pronostics et analyses, sans garantie de résultat.
        </div>
      </footer>
    </>
  );
}
