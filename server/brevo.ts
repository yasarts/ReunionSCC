import * as brevo from '@getbrevo/brevo';

// Debug des variables d'environnement
console.log("=== DEBUG BREVO CONFIG ===");
console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY ? `présente (${process.env.BREVO_API_KEY.substring(0, 10)}...)` : "manquante");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("Variables BREVO:", Object.keys(process.env).filter(k => k.includes('BREVO')));
console.log("Toutes les variables:", Object.keys(process.env).sort());
console.log("========================");

// Interface pour les paramètres d'email
interface MagicLinkEmailParams {
  to: string;
  name: string;
  magicLink: string;
}

// Configuration de l'API Brevo (ou API factice)
let emailsApi: any;
let isBrevoConfigured = false;

if (process.env.BREVO_API_KEY) {
  console.log("Configuration Brevo avec la clé API");
  emailsApi = new brevo.TransactionalEmailsApi();
  emailsApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  isBrevoConfigured = true;
  console.log("Configuration Brevo initialisée avec succès");
} else {
  console.error("ERREUR: Variable d'environnement BREVO_API_KEY manquante");
  console.warn("⚠️  Application démarrée sans Brevo - les emails ne fonctionneront pas");
  
  // API factice
  emailsApi = {
    setApiKey: () => {},
    sendTransacEmail: () => Promise.resolve({ messageId: 'disabled' })
  };
  isBrevoConfigured = false;
}

// Fonction d'envoi d'email
export async function sendMagicLinkEmail(params: MagicLinkEmailParams): Promise<boolean> {
  if (!isBrevoConfigured) {
    console.warn("Tentative d'envoi d'email ignorée - Brevo non configuré");
    console.log(`Email aurait été envoyé à: ${params.to}`);
    console.log(`Lien magique: ${params.magicLink}`);
    return false;
  }

  try {
    console.log(`Envoi d'email de connexion à: ${params.to}`);
    
    const emailContent = {
      to: [{ email: params.to, name: params.name }],
      sender: { 
        email: 'noreply@scc-cirque.org', 
        name: 'SCC - Système de Gestion des Réunions' 
      },
      subject: 'Lien de connexion SCC',
      htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SCC - Connexion Sécurisée</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${params.name},</h2>
            <p>Vous avez demandé un lien de connexion pour accéder au système de gestion des réunions SCC.</p>
            <p>Cliquez sur le bouton ci-dessous pour vous connecter :</p>
            <a href="${params.magicLink}" class="button">Se connecter</a>
            <p><strong>Important :</strong> Ce lien est valable pendant 15 minutes et ne peut être utilisé qu'une seule fois.</p>
            <p>Si vous n'avez pas demandé cette connexion, vous pouvez ignorer cet email en toute sécurité.</p>
          </div>
          <div class="footer">
            <p>© 2025 SCC - Syndicat du Cirque de Création</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
      `,
      textContent: `
      Bonjour ${params.name},
      
      Vous avez demandé un lien de connexion pour accéder au système de gestion des réunions SCC.
      
      Cliquez sur le lien suivant pour vous connecter :
      ${params.magicLink}
      
      Important : Ce lien est valable pendant 15 minutes et ne peut être utilisé qu'une seule fois.
      
      Si vous n'avez pas demandé cette connexion, vous pouvez ignorer cet email en toute sécurité.
      
      © 2025 SCC - Syndicat du Cirque de Création
      `
    };

    const response = await emailsApi.sendTransacEmail(emailContent);
    console.log(`Email envoyé avec succès. ID: ${response.messageId}`);
    return true;

  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    
    if (error.response) {
      console.error("Réponse Brevo:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    return false;
  }
}

// Fonction de test de connexion
export async function testBrevoConnection(): Promise<boolean> {
  if (!isBrevoConfigured) {
    console.warn("Test Brevo ignoré - API non configurée");
    return false;
  }

  try {
    console.log("Test de connexion Brevo...");
    
    const accountApi = new brevo.AccountApi();
    accountApi.setApiKey(brevo.AccountApiApiKeys.apiKey, process.env.BREVO_API_KEY!);
    
    const account = await accountApi.getAccount();
    console.log(`Connexion Brevo réussie. Compte: ${account.email}`);
    return true;
    
  } catch (error: any) {
    console.error("Échec du test de connexion Brevo:", error.message);
    return false;
  }
}

// Export de l'API configurée
export { emailsApi };