# Webforum

Ein einfaches webbasiertes Forum auf Basis von Spring Boot. Benutzer können sich registrieren und anmelden, Themen erstellen und Beiträge verfassen. Die Anwendung besitzt eine rollenbasierte Rechteprüfung für das Bearbeiten und Löschen von Inhalten.

## Funktionen

- Registrierung, Login und Logout über eine HTTP-Session
- Öffentliche Anzeige aller Themen und Beiträge
- Erstellen, Bearbeiten und Löschen von Themen
- Erstellen, Bearbeiten und Löschen von Beiträgen
- Rollen `USER`, `MODERATOR` und `ADMIN`
- Persistente lokale H2-Datenbank
- Responsive Oberfläche mit Bootstrap 5

## Technischer Überblick

| Bereich | Technologie |
| --- | --- |
| Backend | Java 17, Spring Boot 4, Spring MVC |
| Persistenz | Spring Data JPA, Hibernate, H2 |
| Frontend | HTML, CSS, JavaScript, Bootstrap 5.3.3 |
| Build | Maven Wrapper |

## Voraussetzungen

- JDK 17 oder neuer
- Internetzugang beim ersten Build zum Laden der Maven-Abhängigkeiten
- Internetzugang im Browser für die über ein CDN eingebundenen Bootstrap-Dateien

Eine separate Maven-Installation ist nicht erforderlich, da der Maven Wrapper enthalten ist.

## Anwendung starten

Repository klonen beziehungsweise herunterladen und im Projektverzeichnis ausführen:

### Windows

```powershell
.\mvnw.cmd spring-boot:run
```

### Linux und macOS

```bash
./mvnw spring-boot:run
```

Danach ist das Forum unter [http://localhost:8080](http://localhost:8080) erreichbar. Die Login- und Registrierungsseite befindet sich unter [http://localhost:8080/auth.html](http://localhost:8080/auth.html).

Zum Beenden der Anwendung im Terminal `Strg+C` drücken.

## Bedienung

1. Unter `auth.html` einen Benutzer registrieren oder mit einem vorhandenen Konto anmelden.
2. Auf der Startseite ein neues Thema anlegen.
3. Über das Beitragsformular auf ein vorhandenes Thema antworten.
4. Eigene Inhalte über die eingeblendeten Aktionen bearbeiten oder löschen.

### Berechtigungen

| Aktion | USER | MODERATOR | ADMIN |
| --- | --- | --- | --- |
| Themen und Beiträge lesen | Ja | Ja | Ja |
| Themen und Beiträge erstellen | Ja | Ja | Ja |
| Eigenes Thema verwalten | Ja | Ja | Ja |
| Fremdes Thema verwalten | Nein | Nein | Ja |
| Eigenen Beitrag verwalten | Ja | Ja | Ja |
| Fremden Beitrag verwalten | Nein | Ja | Ja |

Erstellen, Bearbeiten und Löschen setzt eine aktive Anmeldung voraus. Beim Löschen eines Themas werden auch die zugehörigen Beiträge entfernt.

## Konfiguration und Datenbank

Die Konfiguration liegt in `src/main/resources/application.properties`. Standardmäßig verwendet die Anwendung eine dateibasierte H2-Datenbank:

```properties
spring.datasource.url=jdbc:h2:file:./data/webforum;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.username=test
spring.datasource.password=test1234
```

Die Daten werden im Verzeichnis `data/` gespeichert und bleiben nach einem Neustart erhalten.

Die H2-Konsole ist während der Entwicklung unter [http://localhost:8080/h2-console](http://localhost:8080/h2-console) verfügbar. Für die Anmeldung dort werden die oben aufgeführte JDBC-URL und die Zugangsdaten verwendet.

## REST-Endpunkte

| Methode | Pfad | Beschreibung | Anmeldung erforderlich |
| --- | --- | --- | --- |
| `POST` | `/register` | Benutzer registrieren und anmelden | Nein |
| `POST` | `/login` | Benutzer anmelden | Nein |
| `GET` | `/session` | Aktuell angemeldeten Benutzer abrufen | Nein |
| `POST` | `/logout` | Sitzung beenden | Nein |
| `GET` | `/topics` | Alle Themen abrufen | Nein |
| `POST` | `/topics` | Thema erstellen | Ja |
| `PUT` | `/topics/{id}` | Thema bearbeiten | Ja |
| `DELETE` | `/topics/{id}` | Thema löschen | Ja |
| `GET` | `/posts` | Alle Beiträge abrufen | Nein |
| `POST` | `/posts` | Beitrag erstellen | Ja |
| `PUT` | `/posts/{id}` | Beitrag bearbeiten | Ja |
| `DELETE` | `/posts/{id}` | Beitrag löschen | Ja |

Geschützte API-Aufrufe verwenden das Session-Cookie, das beim Registrieren oder Anmelden gesetzt wird.

## Tests und Build

Tests ausführen:

```powershell
.\mvnw.cmd test
```

Ausführbare JAR-Datei erstellen:

```powershell
.\mvnw.cmd clean package
```

Die erzeugte Datei liegt anschließend unter `target/webforum-0.0.1-SNAPSHOT.jar` und kann mit folgendem Befehl gestartet werden:

```powershell
java -jar target/webforum-0.0.1-SNAPSHOT.jar
```

Unter Linux und macOS jeweils `.\mvnw.cmd` durch `./mvnw` ersetzen.

## Projektstruktur

```text
src/
├── main/
│   ├── java/de/thaizen/webforum/
│   │   ├── controller/   REST-Endpunkte
│   │   ├── model/        JPA-Entitäten und Rollen
│   │   ├── repository/   Datenbankzugriff
│   │   └── service/      Geschäftslogik und Berechtigungen
│   └── resources/
│       ├── static/       HTML, CSS und JavaScript
│       └── application.properties
└── test/                 Anwendungstests
```

## Hinweis zum Einsatz

Das Projekt ist für Lern- und Entwicklungszwecke ausgelegt. Die frei wählbare Rolle bei der Registrierung, die fest hinterlegten Datenbankzugangsdaten und das verwendete einfache SHA-256-Passwort-Hashing sind nicht für einen produktiven Betrieb geeignet. Vor einer Veröffentlichung sollten insbesondere serverseitige Rollenzuweisung, ein adaptives Passwort-Hashverfahren wie BCrypt oder Argon2, Eingabevalidierung und eine produktionsgerechte Datenbankkonfiguration ergänzt werden.
