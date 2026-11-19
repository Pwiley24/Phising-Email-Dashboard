import os, re, time, requests
from datetime import datetime, timezone
from email import message_from_bytes, policy
from aiosmtpd.controller import Controller

ES = os.environ.get("ES_URL", "http://localhost:9200")  # the Elasticsearch server
INDEX = "email_logs"

URL_RE = re.compile(r'https?://[^\s<>"\')]+')
CLIENTS = {"companyA.com": "companyA", "companyB.org": "companyB", "companyC.com": "companyC",
           "companyD.com": "companyD", "companyE.io": "companyE"}

MAPPING = {"mappings": {"properties": {
    "@timestamp": {"type": "date"}, "sender": {"type": "keyword"},
    "recipient": {"type": "keyword"}, "subject": {"type": "text"},
    "urls": {"type": "keyword"}, "url_count": {"type": "integer"},
    "assignee": {"type": "keyword"}, "status": {"type": "keyword"},
    "client": {"type": "keyword"}, "rt_ticket_id": {"type": "keyword"}}}}

if requests.head(f"{ES}/{INDEX}").status_code == 404:
    requests.put(f"{ES}/{INDEX}", json=MAPPING)


class ESHandler:
    async def handle_DATA(self, server, session, envelope):
        msg = message_from_bytes(envelope.content, policy=policy.default)
        subject = str(msg.get("Subject", ""))
        part = msg.get_body(preferencelist=("plain", "html"))
        body = part.get_content() if part else ""
        urls = list(dict.fromkeys(u.rstrip(".,;") for u in URL_RE.findall(f"{subject} {body}")))
        sender = envelope.mail_from or ""
        domain = sender.split("@")[-1].lower()

        for rcpt in envelope.rcpt_tos:
            requests.post(f"{ES}/{INDEX}/_doc?refresh=true", json={
                "@timestamp": datetime.now(timezone.utc).isoformat(),
                "sender": sender, "recipient": rcpt, "subject": subject,
                "urls": urls, "url_count": len(urls),
                "status": "new", "client": CLIENTS.get(domain, domain)})
            print(f"indexed {sender} -> {rcpt}")
        return "250 Message accepted"


if __name__ == "__main__":
    controller = Controller(ESHandler(), hostname="0.0.0.0", port=2525)
    controller.start()
    print(f"SMTP server listening on port 2525, sending to {ES}. Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        controller.stop()