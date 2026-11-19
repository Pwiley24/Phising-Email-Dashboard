import json, os
from flask import Flask, jsonify, redirect, render_template_string

app = Flask(__name__)
T = json.load(open("tickets.json")) if os.path.exists("tickets.json") else {}

def save():
    json.dump(T, open("tickets.json", "w"))

@app.post("/REST/2.0/ticket")
def create():
    from flask import request
    p = request.get_json(force=True)
    tid = str(len(T) + 1)
    T[tid] = {"id": tid, "Subject": p.get("Subject", ""), "Content": p.get("Content", ""),
              "Status": "new", "Owner": "Nobody"}
    save()
    return jsonify(id=tid), 201

@app.get("/REST/2.0/ticket/<tid>")
def get(tid):
    return jsonify(Status=T[tid]["Status"], Owner={"id": T[tid]["Owner"]})

PAGE = """
<h2>Mock RTIR</h2>
<table border=1 cellpadding=6>
{% for t in tickets %}<tr>
  <td>{{ t.id }}</td><td>{{ t.Subject }}<pre>{{ t.Content }}</pre></td>
  <td>{{ t.Status }}</td><td>{{ t.Owner }}</td>
  <td>{% for a in ["take", "resolve", "reject"] %}
    <form method=post action="/{{ t.id }}/{{ a }}" style="display:inline"><button>{{ a }}</button></form>
  {% endfor %}</td>
</tr>{% endfor %}
</table>"""

@app.get("/")
def index():
    return render_template_string(PAGE, tickets=sorted(T.values(), key=lambda t: -int(t["id"])))

@app.post("/<tid>/<act>")
def do(tid, act):
    t = T[tid]
    if act == "take":
        t["Owner"], t["Status"] = "analyst", "open"
    else:
        t["Status"] = "resolved" if act == "resolve" else "rejected"
    save()
    return redirect("/")

app.run(host="127.0.0.1", port=8080)