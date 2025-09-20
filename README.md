Bei der einrichtung einer secuEntry Schliessanlage kam ich an folgendes Problem:
  Dier Software Version ist schon etwas älter und unterstützt beim Smartphone-User Import nur CSV-Dateien.
  Beim Versuch die CSV-Datei zu versenden kom bei vielen Nutzern die Meldung dass kein email Programm installiert sei.
  Also bekam ich von ihnen den QR-Code zugeschickt.
  Dieser wiederum lässt sich nur mit neuerer Software einlesen.
  Laut Hersteller kann ein Software-Update jedoch das Problem erzeugen, daß der USB-Dongle nicht mehr funktionert.
  Um dieses Problem zu lösen wurde diese kleine webApp geschrieben.

Onliene link: https://solas79.github.io/BurgSmart-Qr2CSV/
  
Einfache WebApp zum einlesen der BURGsmart QR-Codes (Smartphone-User).

QR-Code als Datei oder über die Kamera einlesen und in eine CSV-Datei schreiben.
Sollte die Kamerafunktion nicht zur Verfuegung stehen wird sie vom verwendetem Browser nicht unterstützt.

Nach oeffnen der index.html
1. Muster CSV oder die secuEntry auswählen
2. QR-Bild auswählen (mehrfachauswahl moeglich) oder Kamera starten
3. CSV Speichern oder in die Zwischenablage kopieren.

Die CSV erhaelt den Namen: "Nachnamen"-reg.csv
