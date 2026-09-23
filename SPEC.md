# Kürzungs-Trainer — Spezifikation

Lernspiel für Klasse 7: Produkte aus vier Brüchen so **zusammenstellen**, dass man **clever kürzt** und **Vorzeichen richtig** setzt.

## Ziel der App

Der Schüler löst **10 Aufgaben richtig**. Danach gilt das Spiel als gewonnen und die **benötigte Zeit** wird angezeigt.

Es geht nicht primär ums Ausrechnen großer Zahlen, sondern um:

1. Faktoren sinnvoll **zu Paaren gruppieren**
2. In jedem Paar **kürzen**
3. **Vorzeichen** der Paare und des Gesamtergebnisses festlegen
4. Die beiden Zwischenergebnisse **multiplizieren**

Mathematische Grundlage (wie in der Unterrichtsidee):

\[
A \cdot B \cdot C \cdot D = (A \cdot C) \cdot (B \cdot D)
\]

Jede Paarung ist rechnerisch gültig. Eine **clevere** Paarung ist eine, bei der in beiden Paaren etwas weggekürzt werden kann.

## Pädagogisches Design

- Alle Aufgaben bestehen aus genau **vier Faktoren** (positive oder negative Brüche).
- Das Gesamtergebnis ist immer eine **kleine ganze Zahl** (typisch zwischen −80 und 80).
- Mindestens eine Paarung kürzt „sichtbar“ (Zähler eines Faktors trifft Nenner eines anderen).
- Falsche Eingaben zählen nicht als Sieg-Punkt. Die Aufgabe wird erklärt und eine neue generiert.
- Feedback nennt explizit:
  - ob die gewählte Paarung gut kürzt
  - ob Vorzeichen stimmen
  - ob Zwischenergebnisse und Endergebnis korrekt sind

## Spielablauf

1. Startbildschirm mit kurzer Erklärung und Button **Los**.
2. Timer startet mit der ersten Aufgabe.
3. Vier Bruch-Karten werden angezeigt (Reihenfolge gemischt).
4. Schüler wählt **Paar 1** durch Anklicken von zwei Karten. Die restlichen zwei bilden **Paar 2**.
5. Eingabe:
   - Zwischenergebnis Paar 1
   - Zwischenergebnis Paar 2
   - Gesamtergebnis
6. Auswertung.
7. Nach 10 richtigen Aufgaben: Gewinnbildschirm mit Zeit (`mm:ss`).
8. Button **Nochmal spielen** setzt Fortschritt und Timer zurück.

## Aufgabengenerierung

Jede Aufgabe wird so gebaut, dass eine „Brücken-Paarung“ existiert:

- Zwei Brückenzahlen \(b_1, b_2\) (z. B. 5 und 7) stehen je einmal im Zähler und einmal im Nenner **verschiedener** Faktoren.
- Die übrigen Zähler/Nenner sind kleine ganze Zahlen aus \(\{2,3,4,5,6,8,10,12\}\).
- 0, 1 oder 2 Faktoren sind negativ (nie drei, damit das Vorzeichen-Training klar bleibt).
- Nach dem Mischen der vier Positionen muss der Schüler die zusammengehörigen Karten selbst finden.

Auswertung intern mit gekürzten Brüchen (Zähler/Nenner als ganze Zahlen, Vorzeichen am Zähler).

## Bewertung einer Abgabe

Eine Aufgabe gilt als **richtig**, wenn das **Gesamtergebnis** exakt dem Produkt entspricht.

Zusätzliches qualitatives Feedback (zählt nicht für den Sieg, steuert die Rückmeldung):

| Kriterium | Bedeutung |
|---|---|
| Clevere Paarung | In beiden gewählten Paaren lässt sich kürzen (ggT > 1) oder das Paar wird zur ganzen Zahl |
| Vorzeichen Paare | Jedes Zwischenergebnis hat das richtige Vorzeichen |
| Zwischenwerte | Beide Paar-Produkte numerisch korrekt |
| Endergebnis | Produkt beider Zwischenwerte bzw. aller vier Faktoren korrekt |

Eingaben dürfen ganze Zahlen oder Brüche der Form `a/b` bzw. `-a/b` sein.

## Oberfläche

- Eine einzige Datei: `index.html` (HTML + CSS + JS, keine Abhängigkeiten).
- Sprache: Deutsch.
- Zielgerät: Laptop/Tablet, bedienbar per Maus oder Touch.
- Klare Typografie, große Bruchdarstellung, hoher Kontrast.
- Fortschritt `x / 10` und laufende Zeit immer sichtbar.
- Keine Ablenkung durch Sounds oder Werbung.

## Technische Vorgaben

- Rein clientseitig, läuft beim Öffnen der HTML-Datei.
- Kein Backend, kein LocalStorage zwingend nötig (optional für Bestzeit).
- Zufall über `Math.random`.
- Barrierearm: große Klickflächen, Tastatur: Enter prüft die Eingabe.

## Nicht-Ziele

- Keine gemischten Zahlen, keine Variablen, keine Potenzen.
- Kein Multiplayer, keine Konten.
- Keine unendlich langen Nenner; alles bleibt siebtauglich.
