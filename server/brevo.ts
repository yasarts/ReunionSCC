import * as brevo from '@getbrevo/brevo';

if (!process.env.BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY environment variable must be set");
}

// Configuration de l'API Brevo
const apiInstance = brevo.createApiInstance();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

const emailsApi = new brevo.TransactionalEmailsApi(apiInstance);

interface MagicLinkEmailParams {
  to: string;
  name: string;
  magicLink: string;
}

export async function sendMagicLinkEmail(params: MagicLinkEmailParams): Promise<boolean> {
  try {
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.to = [{ email: params.to, name: params.name }];
    sendSmtpEmail.sender = { 
      email: 'noreply@scc-cirque.org', 
      name: 'SCC - Système de Gestion des Réunions' 
    };
    sendSmtpEmail.subject = 'Lien de connexion SCC';
    sendSmtpEmail.htmlContent = `
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
    `;
    
    sendSmtpEmail.textContent = `
      Bonjour ${params.name},
      
      Vous avez demandé un lien de connexion pour accéder au système de gestion des réunions SCC.
      
      Cliquez sur le lien suivant pour vous connecter :
      ${params.magicLink}
      
      Important : Ce lien est valable pendant 15 minutes et ne peut être utilisé qu'une seule fois.
      
      Si vous n'avez pas demandé cette connexion, vous pouvez ignorer cet email en toute sécurité.
      
      © 2025 SCC - Syndicat du Cirque de Création
    `;

    const response = await emailsApi.sendTransacEmail(sendSmtpEmail);
    console.log('Magic link email sent successfully:', response.messageId);
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
}