"""Utilitário de envio de e-mail via SMTP."""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str) -> bool:
    """Envia um e-mail HTML. Retorna True se enviado com sucesso."""
    if not settings.SMTP_USER or not settings.SMTP_PASS:
        logger.warning("SMTP não configurado — e-mail não enviado para %s", to)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = to
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(msg["From"], [to], msg.as_string())
        logger.info("E-mail enviado para %s — %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Falha ao enviar e-mail para %s: %s", to, exc)
        return False


def send_activation_email(to: str, nome: str, token: str) -> bool:
    url = f"{settings.FRONTEND_URL}/ativar?token={token}"
    html = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#1e3a5f,#3b82f6);padding:36px 40px;text-align:center">
              <p style="color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">
                Software de Equalização
              </p>
              <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0;line-height:1.2">
                Seu acesso está pronto!
              </h1>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:36px 40px">
              <p style="color:#374151;font-size:15px;margin:0 0 16px">Olá, <strong>{nome}</strong>!</p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px">
                Sua compra foi confirmada. Clique no botão abaixo para criar sua senha
                e ter acesso imediato ao <strong>Equalizador PQ</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding:8px 0 28px">
                  <a href="{url}"
                     style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);
                            color:#fff;font-size:15px;font-weight:700;text-decoration:none;
                            padding:14px 36px;border-radius:10px;letter-spacing:.5px">
                    Criar minha senha e acessar →
                  </a>
                </td></tr>
              </table>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
                Link válido por 72 horas. Se não foi você, ignore este e-mail.
              </p>
            </td></tr>
            <!-- Footer -->
            <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
              <p style="color:#9ca3af;font-size:11px;margin:0">
                Equalizador PQ · Software de Equalização de Propostas
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """
    return send_email(to, "✅ Seu acesso ao Equalizador PQ está pronto!", html)


def send_subscription_renewed_email(to: str, nome: str, ate: str) -> bool:
    html = f"""
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:40px 20px">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
            <tr><td style="background:linear-gradient(135deg,#065f46,#10b981);padding:36px 40px;text-align:center">
              <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0">Assinatura renovada! 🎉</h1>
            </td></tr>
            <tr><td style="padding:36px 40px">
              <p style="color:#374151;font-size:15px;margin:0 0 16px">Olá, <strong>{nome}</strong>!</p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 8px">
                Sua assinatura do <strong>Equalizador PQ</strong> foi renovada com sucesso.
              </p>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px">
                Acesso garantido até: <strong style="color:#0f172a">{ate}</strong>
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center">
                  <a href="{settings.FRONTEND_URL}"
                     style="display:inline-block;background:#3b82f6;color:#fff;font-size:14px;
                            font-weight:700;text-decoration:none;padding:12px 32px;border-radius:10px">
                    Acessar o sistema →
                  </a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
    """
    return send_email(to, "🔄 Assinatura renovada — Equalizador PQ", html)
