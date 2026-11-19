import sys, smtplib
from email.message import EmailMessage

HOST = sys.argv[1] if len(sys.argv) > 1 else "localhost"

def send(sender, to, subject, body):
    m = EmailMessage()
    m["From"], m["To"], m["Subject"] = sender, to, subject
    m.set_content(body)
    with smtplib.SMTP(HOST, 2525) as s:
        s.send_message(m)
    print("sent:", subject)

send("frank@spamzone.biz", "alice@companyA.com",
     "URGENT: You won a prize! Verify your account",
     "Click here to claim: http://free-prize-claim.biz/win")

send("bob@gmail.com", "alice@companyB.org",
     "Lunch tomorrow?",
     "Want to grab lunch? Menu is at https://company.com/portal")