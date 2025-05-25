import React from 'react';
import type { Payment, Student } from '@/types';

interface PaymentReceiptProps {
  payment: Payment;
  student: Student;
  schoolName: string;
}

const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ payment, student, schoolName }) => {
  // Formatter pour les montants en FCFA
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  // Format pour la date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  // Obtenir le nom du mois payé
  const getMonthName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  // Type de paiement en français
  const getPaymentType = (type: string) => {
    const types: Record<string, string> = {
      tuition: 'Frais de scolarité',
      books: 'Livres scolaires',
      activities: 'Activités',
      other: 'Autre',
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="receipt-container p-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .receipt-container {
            width: 80mm; /* Largeur standard pour un reçu de caisse */
            padding: 5mm;
            margin: 0;
          }
          .header, .footer {
            text-align: center;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
        }
      `}</style>

      <div className="header text-center mb-4">
        <h2 className="font-bold text-xl">{schoolName}</h2>
        <p className="text-sm">REÇU DE PAIEMENT</p>
        <div className="divider my-2 border-t border-dashed border-gray-400"></div>
      </div>

      <div className="content mb-4 text-sm">
        <p><strong>Reçu N°:</strong> {payment.id}</p>
        <p><strong>Date:</strong> {formatDate(payment.date)}</p>
        <p><strong>Élève:</strong> {student.firstName} {student.lastName}</p>
        <p><strong>Classe:</strong> {student.className || 'Non spécifiée'}</p>
        <p><strong>Type de paiement:</strong> {getPaymentType(payment.type)}</p>
        <p><strong>Pour la période:</strong> {getMonthName(payment.date)}</p>
        <div className="divider my-2 border-t border-dashed border-gray-400"></div>
        <p className="font-bold"><strong>Montant payé:</strong> {formatCurrency(payment.amount)}</p>
        <p><strong>Statut:</strong> {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'En retard'}</p>
        {payment.notes && (
          <p className="mt-2"><strong>Notes:</strong> {payment.notes}</p>
        )}
      </div>

      <div className="footer text-center mt-4">
        <div className="divider my-2 border-t border-dashed border-gray-400"></div>
        <p className="text-xs">Merci pour votre paiement!</p>
        <p className="text-xs mt-1">Ce reçu est une preuve de paiement. Veuillez le conserver.</p>
        {/* Utiliser le compteur d'impressions avec vérification pour éviter les erreurs */}
        {(payment as any).printCount > 0 && (
          <p className="text-xs mt-2 text-gray-500">
            Reçu imprimé {(payment as any).printCount} fois
            <span className="text-xs ml-1">{(payment as any).printCount > 1 ? '(duplicata)' : ''}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentReceipt;
