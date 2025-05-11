import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10">
      <h1 className="text-4xl font-bold mb-8">Bienvenue sur l'application de gestion scolaire</h1>
      <nav className="space-x-4">
        <Link to="/payments" className="text-blue-600 underline">Paiements</Link>
        <Link to="/attendance" className="text-blue-600 underline">Présences</Link>
        <Link to="/settings" className="text-blue-600 underline">Paramètres</Link>
      </nav>
    </div>
  );
};

export default Home;
