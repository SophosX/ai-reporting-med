#!/usr/bin/env python3
"""
Script zum Exportieren der Studiendaten
"""
import requests
import json
from datetime import datetime

# Konfiguration
API_URL = "http://localhost:8000"
USERNAME = "admin"  # Ihr Benutzername
PASSWORD = "admin"  # Ihr Passwort

def login():
    """Login und JWT Token erhalten"""
    response = requests.post(
        f"{API_URL}/auth/login",
        data={"username": USERNAME, "password": PASSWORD}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login fehlgeschlagen: {response.status_code}")
        return None

def export_study_data(token):
    """Studiendaten exportieren"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{API_URL}/study/study-data/export",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Dateiname mit Timestamp
        filename = f"study_data_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Daten in Datei speichern
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Studiendaten erfolgreich exportiert: {filename}")
        print(f"📊 Anzahl Sessions: {data.get('total_sessions', 0)}")
        
        # Zusammenfassung anzeigen
        if data.get('sessions'):
            print("\n📋 Session-Übersicht:")
            for session in data['sessions']:
                participant = session.get('participant', {})
                print(f"\n  Session ID: {session.get('session_id')}")
                print(f"  Teilnehmer: {participant.get('full_name')} ({participant.get('username')})")
                print(f"  Erfahrung: {participant.get('experience_level')}")
                print(f"  Dauer: {session.get('total_time_seconds', 0)} Sekunden")
                print(f"  Pausen: {session.get('pause_count', 0)}")
                print(f"  Wörter (Input/Final): {session.get('input_words', 0)}/{session.get('final_words', 0)}")
        
        return data
    else:
        print(f"❌ Fehler beim Export: {response.status_code}")
        print(response.text)
        return None

if __name__ == "__main__":
    print("🔐 Anmelden...")
    token = login()
    
    if token:
        print("📥 Exportiere Studiendaten...")
        export_study_data(token)
    else:
        print("❌ Anmeldung fehlgeschlagen")