# RadarCase

RadarCase è un'applicazione web progettata per il monitoraggio e il tracciamento di annunci immobiliari, con funzionalità di automazione per il controllo dei prezzi.

## Panoramica del Progetto
Il progetto è una web app costruita per automatizzare la raccolta e la supervisione di dati immobiliari. Utilizza script di scraping backend (Python) e un'interfaccia frontend per visualizzare e gestire i dati estratti.

### Stack Tecnologico e Componenti Principali
*   **Backend & Scraping**:
    *   Script in Python per il data scraping.
    *   Integrazioni API personalizzate.
*   **Infrastructure & Database**:
    *   Firebase come infrastruttura principale.
    *   Firestore per la persistenza dei dati, con regole di sicurezza e indici configurati.
*   **Geospaziale**:
    *   Utilizzo di file GeoJSON per la gestione di dati geografici, legati alle zone OMI (Osservatorio Mercato Immobiliare).
*   **Configurazione**:
    *   File di ambiente (`.env.example`) per la gestione delle variabili sensibili.
    *   Metadata e configurazioni di progetto.

## Struttura delle Directory
*   `/api`: Contiene i file di integrazione API per il backend.
*   `/public`: Risorse statiche, incluse favicon e dataset geospaziali (GeoJSON).
*   File Root: Configurazioni Firebase, regole Firestore, file di dipendenze e configurazione del progetto.

## Installazione e Setup
1.  Clonare il repository.
2.  Installare le dipendenze tramite `npm install`.
3.  Configurare il file `.env` partendo da `.env.example` con le chiavi API e i dettagli di Firebase necessari.
4.  Configurare l'ambiente Firebase seguendo le specifiche nei file `firebase-*.json`.

## Obiettivo
Il progetto mira a fornire una soluzione automatizzata ("Radar") per chi cerca immobili, notificando variazioni di prezzo e mantenendo uno storico dei dati monitorati in un'interfaccia web dedicata.

---
*Nota: Assicurarsi di mantenere private le chiavi API e le credenziali di Firebase configurate nelle variabili di ambiente.*
