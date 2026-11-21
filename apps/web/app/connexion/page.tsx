import AuthForm from "@/components/AuthForm";

export default function ConnexionPage() {
  return (
    <main className="container" style={{ paddingTop: 40 }}>
      <div className="eyebrow">Espace client</div>
      <h1 style={{ fontSize: 34 }}>Connexion</h1>
      <AuthForm mode="login" />
      <p className="muted" style={{ marginTop: 14 }}>
        Pas encore de compte ? <a href="/inscription">Créer un compte</a>
      </p>
    </main>
  );
}
