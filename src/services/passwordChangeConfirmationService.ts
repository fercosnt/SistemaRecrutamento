/**
 * Password Change Confirmation Email Service
 *
 * Envia email de confirmação quando a senha é alterada.
 * Integra com N8N para envio de emails.
 *
 * @module services/passwordChangeConfirmationService
 */

import { sendToN8N, N8NMode } from '@/features/cadastro/services/n8nService';

/**
 * Dados para envio do email de confirmação
 */
export interface PasswordChangeEmailData {
  /**
   * Nome completo do usuário
   */
  nomeCompleto: string;

  /**
   * Email do destinatário
   */
  email: string;

  /**
   * Data e hora da alteração (formato: "16/01/2025 às 14:30")
   */
  dataHora: string;

  /**
   * Tipo de dispositivo (desktop, mobile, tablet)
   */
  dispositivo: string;

  /**
   * Nome e versão do navegador
   */
  navegador: string;

  /**
   * Endereço IP do usuário
   */
  ipAddress: string;
}

/**
 * Payload enviado para o workflow N8N de emails
 */
interface EmailAutomaticoPayload {
  event: 'password.changed';
  timestamp: string;
  data: {
    email_type: 'password_change_confirmation';
    recipient: {
      email: string;
      nome_completo: string;
    };
    template_data: {
      NOME_COMPLETO: string;
      DATA_HORA: string;
      DISPOSITIVO: string;
      NAVEGADOR: string;
      IP_ADDRESS: string;
    };
    metadata: {
      ip_address: string;
      device_type: string;
      browser: string;
    };
  };
}

/**
 * Envia email de confirmação de alteração de senha
 *
 * Features:
 * - Integração com N8N
 * - Templates HTML + TXT
 * - Retry automático (3 tentativas)
 * - Error handling robusto
 *
 * @param emailData - Dados para o email
 * @param mode - Modo de execução (test ou production)
 * @returns Promise que resolve quando email for enviado
 * @throws {N8NError} Se falhar ao enviar email
 *
 * @example
 * ```typescript
 * await sendPasswordChangeConfirmation({
 *   nomeCompleto: 'João Silva',
 *   email: 'joao@example.com',
 *   dataHora: '16/01/2025 às 14:30',
 *   dispositivo: 'desktop',
 *   navegador: 'Chrome 120.0',
 *   ipAddress: '192.168.1.1'
 * });
 * ```
 */
export async function sendPasswordChangeConfirmation(
  emailData: PasswordChangeEmailData,
  mode: N8NMode = 'production'
): Promise<void> {
  try {
    console.log('[Password Confirmation] Enviando email para:', emailData.email);

    // Construir payload para N8N
    const payload: EmailAutomaticoPayload = {
      event: 'password.changed',
      timestamp: new Date().toISOString(),
      data: {
        email_type: 'password_change_confirmation',
        recipient: {
          email: emailData.email,
          nome_completo: emailData.nomeCompleto,
        },
        template_data: {
          NOME_COMPLETO: emailData.nomeCompleto,
          DATA_HORA: emailData.dataHora,
          DISPOSITIVO: emailData.dispositivo,
          NAVEGADOR: emailData.navegador,
          IP_ADDRESS: emailData.ipAddress,
        },
        metadata: {
          ip_address: emailData.ipAddress,
          device_type: emailData.dispositivo,
          browser: emailData.navegador,
        },
      },
    };

    // Enviar via N8N (com retry automático)
    const response = await sendToN8N('emails-automaticos', payload as any, mode);

    if (response.success) {
      console.log('[Password Confirmation] ✓ Email enviado com sucesso');
      console.log('[Password Confirmation] Execution ID:', response.workflow_execution_id);
    } else {
      console.error('[Password Confirmation] ✗ Falha ao enviar email:', response.error);
      throw new Error(`Falha ao enviar email: ${response.error}`);
    }
  } catch (error: any) {
    console.error('[Password Confirmation] Erro ao enviar email de confirmação:', error);

    // Re-lançar erro para permitir tratamento upstream
    throw error;
  }
}

/**
 * Formata data atual no formato brasileiro
 *
 * @returns String no formato "16/01/2025 às 14:30"
 */
export function formatDataHora(): string {
  const now = new Date();

  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const ano = now.getFullYear();

  const hora = String(now.getHours()).padStart(2, '0');
  const minuto = String(now.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
}

/**
 * Detecta tipo de dispositivo baseado no user agent
 *
 * @param userAgent - User agent string do navegador
 * @returns Tipo de dispositivo: 'desktop', 'mobile' ou 'tablet'
 */
export function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile') && !ua.includes('tablet')) {
    return 'mobile';
  }

  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }

  return 'desktop';
}

/**
 * Extrai nome do navegador e versão do user agent
 *
 * @param userAgent - User agent string do navegador
 * @returns Nome e versão do navegador (ex: "Chrome 120.0")
 */
export function extractBrowserInfo(userAgent: string): string {
  const ua = userAgent;

  // Chrome
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (chromeMatch && !ua.includes('Edg')) {
    return `Chrome ${chromeMatch[1]}`;
  }

  // Edge
  const edgeMatch = ua.match(/Edg\/(\d+)/);
  if (edgeMatch) {
    return `Edge ${edgeMatch[1]}`;
  }

  // Firefox
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  if (firefoxMatch) {
    return `Firefox ${firefoxMatch[1]}`;
  }

  // Safari
  const safariMatch = ua.match(/Safari\/(\d+)/);
  if (safariMatch && !ua.includes('Chrome')) {
    return `Safari ${safariMatch[1]}`;
  }

  // Opera
  const operaMatch = ua.match(/OPR\/(\d+)/);
  if (operaMatch) {
    return `Opera ${operaMatch[1]}`;
  }

  return 'Navegador Desconhecido';
}
