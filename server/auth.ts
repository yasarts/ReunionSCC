import jwt from 'jsonwebtoken';
import { sendMagicLinkEmail } from './brevo';
import { storage } from './storage';

// Durée de validité du magic link (15 minutes)
const MAGIC_LINK_EXPIRY = 15 * 60; // 15 minutes en secondes

// Secret pour signer les JWT (en production, utiliser une variable d'environnement sécurisée)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface MagicLinkPayload {
  email: string;
  timestamp: number;
  type: 'magic-link';
}

export function generateMagicLinkToken(email: string): string {
  const payload: MagicLinkPayload = {
    email,
    timestamp: Date.now(),
    type: 'magic-link'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${MAGIC_LINK_EXPIRY}s` });
}

export function verifyMagicLinkToken(token: string): { email: string; valid: boolean } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MagicLinkPayload;
    
    // Vérifier que c'est bien un token de magic link
    if (decoded.type !== 'magic-link') {
      return { email: '', valid: false };
    }

    // Vérifier l'expiration (sécurité supplémentaire)
    const now = Date.now();
    const tokenAge = (now - decoded.timestamp) / 1000; // en secondes
    
    if (tokenAge > MAGIC_LINK_EXPIRY) {
      return { email: '', valid: false };
    }

    return { email: decoded.email, valid: true };
  } catch (error) {
    console.error('Invalid magic link token:', error);
    return { email: '', valid: false };
  }
}

export async function sendMagicLink(email: string, baseUrl: string): Promise<boolean> {
  try {
    // Vérifier que l'utilisateur existe
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
      console.log(`Magic link requested for non-existent email: ${email}`);
      return true; // On retourne true pour ne pas révéler si l'email existe
    }

    // Générer le token
    const token = generateMagicLinkToken(email);
    
    // Construire le lien magique
    const magicLink = `${baseUrl}/auth/magic-link?token=${token}`;
    
    // Envoyer l'email
    const emailSent = await sendMagicLinkEmail({
      to: email,
      name: `${user.firstName} ${user.lastName}`,
      magicLink
    });

    if (emailSent) {
      console.log(`Magic link sent successfully to: ${email}`);
      return true;
    } else {
      console.error(`Failed to send magic link to: ${email}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending magic link:', error);
    return false;
  }
}

export function generateSessionToken(userId: number): string {
  const payload = {
    userId,
    type: 'session',
    timestamp: Date.now()
  };

  // Token de session valable 7 jours
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySessionToken(token: string): { userId: number; valid: boolean } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'session') {
      return { userId: 0, valid: false };
    }

    return { userId: decoded.userId, valid: true };
  } catch (error) {
    return { userId: 0, valid: false };
  }
}