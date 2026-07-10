import os
import sqlite3
import base64
import hashlib
from flask import Flask, render_template, request, jsonify, session
from cryptography.fernet import Fernet

app = Flask(__name__)
app.secret_key = os.urandom(24)

def get_cipher(master_key):
    key = base64.urlsafe_b64encode(hashlib.sha256(master_key.encode()).digest())
    return Fernet(key)

def get_db():
    db_path = os.path.join(os.path.dirname(__file__), "vault.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()

init_db()

def is_unlocked():
    return session.get("unlocked") is True

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    master_key = data.get("master_key")
    if master_key == "1234":
        session["unlocked"] = True
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Invalid Master Key"}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/api/status", methods=["GET"])
def check_status():
    return jsonify({"unlocked": is_unlocked()})

@app.route("/api/users", methods=["GET"])
def get_users():
    if not is_unlocked():
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, created_at FROM users ORDER BY username ASC")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users)

@app.route("/api/users", methods=["POST"])
def create_user():
    if not is_unlocked():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    username = data.get("username", "").strip()
    if not username:
        return jsonify({"error": "Username is required"}), 400
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username) VALUES (?)", (username,))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return jsonify({"success": True, "user": {"id": user_id, "username": username}})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "User already exists"}), 409

@app.route("/api/users/<int:user_id>/records", methods=["GET"])
def get_records(user_id):
    if not is_unlocked():
        return jsonify({"error": "Unauthorized"}), 401
    cipher = get_cipher("1234")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, data, created_at FROM records WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    records = []
    for row in rows:
        try:
            title_dec = cipher.decrypt(row["title"].encode()).decode()
            data_dec = cipher.decrypt(row["data"].encode()).decode()
            records.append({
                "id": row["id"],
                "title": title_dec,
                "data": data_dec,
                "enc_title": row["title"],
                "enc_data": row["data"],
                "created_at": row["created_at"]
            })
        except Exception:
            records.append({
                "id": row["id"],
                "title": "[Decryption Error]",
                "data": "[Decryption Error]",
                "enc_title": row["title"],
                "enc_data": row["data"],
                "created_at": row["created_at"]
            })
    return jsonify(records)

@app.route("/api/users/<int:user_id>/records", methods=["POST"])
def add_record(user_id):
    if not is_unlocked():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    title = data.get("title", "").strip()
    record_data = data.get("data", "").strip()
    if not title or not record_data:
        return jsonify({"error": "Title and Data are required"}), 400
    cipher = get_cipher("1234")
    enc_title = cipher.encrypt(title.encode()).decode()
    enc_data = cipher.encrypt(record_data.encode()).decode()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO records (user_id, title, data) VALUES (?, ?, ?)", (user_id, enc_title, enc_data))
    conn.commit()
    record_id = cursor.lastrowid
    conn.close()
    return jsonify({"success": True, "record": {"id": record_id, "title": title, "data": record_data}})

@app.route("/api/records/<int:record_id>", methods=["DELETE"])
def delete_record(record_id):
    if not is_unlocked():
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM records WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    if not is_unlocked():
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM records WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
    