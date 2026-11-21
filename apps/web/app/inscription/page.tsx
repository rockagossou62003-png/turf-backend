import AuthForm from "@/components/AuthForm";

export default function InscriptionPage() {
  return (
    <main className="container" style={{ paddingTop: 40 }}>
      <div className="eyebrow">Espace client</div>
      <h1 style={{ fontSize: 34 }}>Inscription</h1>
      <AuthForm mode="register" />
      <p className="muted" style={{ marginTop: 14 }}>
        Déjà inscrit ? <a href="/connexion">Se connecter</a>
      </p>
    </main>
  );
}
