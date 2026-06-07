#!/usr/bin/env python3
"""Send email via SMTP (Gmail / Outlook / etc.)"""
import smtplib
import sys
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def send_email(to_email, subject, body, from_email=None, smtp_host=None, smtp_port=None, smtp_user=None, smtp_pass=None):
    # Load from config if not provided
    config_path = '/opt/data/job_hunter/.email_config.json'
    try:
        with open(config_path) as f:
            cfg = json.load(f)
        smtp_host = smtp_host or cfg.get('smtp_host', 'smtp.gmail.com')
        smtp_port = smtp_port or cfg.get('smtp_port', 587)
        smtp_user = smtp_user or cfg.get('smtp_user')
        smtp_pass = smtp_pass or cfg.get('smtp_pass')
        from_email = from_email or cfg.get('from_email') or smtp_user
    except Exception:
        pass

    if not smtp_user or not smtp_pass or not from_email:
        return {'error': 'Email credentials not configured. Run: jobhunter-email-setup'}

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email

    html_part = MIMEText(body.replace('\n', '<br>\n'), 'html')
    text_part = MIMEText(body, 'plain')
    msg.attach(text_part)
    msg.attach(html_part)

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
        return {'success': True, 'sent_to': to_email}
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    data = json.load(sys.stdin)
    result = send_email(
        to_email=data['to'],
        subject=data['subject'],
        body=data['body'],
        from_email=data.get('from'),
        smtp_host=data.get('smtp_host'),
        smtp_port=data.get('smtp_port'),
        smtp_user=data.get('smtp_user'),
        smtp_pass=data.get('smtp_pass')
    )
    print(json.dumps(result))
