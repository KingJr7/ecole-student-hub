import React, { useState } from "react";
import { login, LoginResponse } from "../auth";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Optionnel : pour redirection après connexion (remplacer par votre route dashboard)
  // import { useRouter } from 'next/router';
  // const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res: LoginResponse = await login(email, password);
      // Stocker le token, le school_id et le rôle dans le localStorage
      localStorage.setItem("school_id", res.user.school_id);
      localStorage.setItem("role", res.role);
      localStorage.setItem("user_name", res.user.name);
      localStorage.setItem("user_first_name", res.user.first_name);
      localStorage.setItem("user_email", res.user.email);
      localStorage.setItem("user_phone", res.user.phone);
      // Rediriger l'utilisateur (décommenter si Next.js ou React Router)
      // router.push("/dashboard");
      window.location.reload(); // Ou afficher le dashboard directement
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Erreur lors de la connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-indigo-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md flex flex-col gap-6 border border-gray-100"
      >
        <h1 className="text-3xl font-bold text-center text-indigo-700">Connexion à l'espace école</h1>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="font-medium text-gray-700">Mot de passe</label>
          <input
            id="password"
            type="password"
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded px-4 py-2 transition disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
};

export default Login;
