import os, time, requests

ES = "http://localhost:9200/email_logs"
RT = os.environ["RT_URL"].rstrip("/")
H = {"Authorization": "token " + os.environ["RT_TOKEN"], "Content-Type": "application/json"}

def find(query):
    return requests.post(f"{ES}/_search", json={"size": 25, "query": query}).json()["hits"]["hits"]

def update(doc_id, fields):
    requests.post(f"{ES}/_update/{doc_id}?refresh=true", json={"doc": fields})

while True:
    try:
        # 1. new emails (last 10 minutes, no ticket yet) --> create a ticket
        for h in find({"bool": {"must": [{"range": {"@timestamp": {"gte": "now-10m"}}}],
                                "must_not": [{"exists": {"field": "rt_ticket_id"}}]}}):
            s = h["_source"]
            r = requests.post(f"{RT}/REST/2.0/ticket", headers=H, json={
                "Queue": "Incident Reports", "Subject": s.get("subject", "email"),
                "Content": f"From: {s.get('sender')}\nTo: {s.get('recipient')}\nURLs: {s.get('urls')}"})
            update(h["_id"], {"rt_ticket_id": r.json()["id"], "status": "new"})

        # 2. open tickets --> copy owner and status back onto the email
        for h in find({"bool": {"must": [{"exists": {"field": "rt_ticket_id"}}],
                                "must_not": [{"term": {"status": "researched"}}]}}):
            t = requests.get(f"{RT}/REST/2.0/ticket/{h['_source']['rt_ticket_id']}", headers=H).json()
            owner = t["Owner"]["id"]
            if t["Status"].lower() in ("resolved", "rejected"):
                state = "researched"
            else:
                state = "new" if owner == "Nobody" else "assigned"
            update(h["_id"], {"assignee": None if owner == "Nobody" else owner, "status": state})
    except Exception as e:
        print("error:", e)
    time.sleep(60)