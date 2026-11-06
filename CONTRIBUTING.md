# Konkursy Literackie — katalog dla Oazy Czytelników

Nieoficjalny, publiczny katalog konkursów literackich, naborów wydawniczych i wydarzeń scenicznych. Interfejs jest przystosowany do telefonów i pozwala wyszukiwać ogłoszenia według gatunku, terminu, nagrody, języka oraz wpisowego.

## Adres i publikowanie

Strona jest publikowana z katalogu `docs/` przez GitHub Pages. Po włączeniu **Settings → Pages → Build and deployment → GitHub Actions** każde zatwierdzenie zmiany w `docs/` na gałęzi `main` uruchamia workflow `.github/workflows/pages.yml` i aktualizuje stronę. Workflow można także uruchomić ręcznie.

## Aktualizacja konkursów

Jedynym źródłem danych katalogu jest `docs/data.json`:

- `entries` to tablica konkursów i naborów; każdy wpis musi mieć unikalny `id`.
- `deadline` to data `YYYY-MM-DD` lub `null` dla ogłoszenia bez ustalonego terminu.
- `categories` zawiera jedną lub więcej kategorii `Proza`, `Poezja`, `Inne`.
- `genres`, `type`, `language`, `feeClass` i `prizeTypes` obsługują filtry.
- `topCashPln` to najwyższa jednoznacznie określona *pojedyncza nagroda pieniężna w PLN*; `null`, gdy nie da się jej wiarygodnie ustalić. Nie wpisuj tu łącznej puli ani wartości nagród rzeczowych.
- `link` prowadzi do organizatora, regulaminu albo (gdy brak źródła pierwotnego) do serwisu informacyjnego; `linkType` opisuje typ źródła.
- `updated` to data ostatniej **merytorycznej weryfikacji całego zestawienia**, nie data automatycznego wdrożenia.

Aktualizacja `docs/data.json` automatycznie trafia na stronę. Terminy minione są oznaczane i ukrywane na podstawie daty urządzenia odwiedzającego.

**Ważne:** GitHub Pages nie znajduje nowych konkursów samodzielnie. Automatyzacja wyszukiwania źródeł wymaga dodatkowego procesu (np. GitHub Actions), najlepiej przygotowującego propozycje zmian do zatwierdzenia. Zawsze sprawdzaj oficjalne regulaminy.

## Struktura

```text
docs/
  index.html        # strona
  styles.css        # wygląd
  app.js            # wyszukiwarka i filtry
  data.json         # lista konkursów
.github/workflows/
  pages.yml         # walidacja i publikowanie
```

Nie jest wymagany serwer, baza danych, JavaScript framework ani dodatkowa usługa hostingowa. Ulubione zapisywane są lokalnie w przeglądarce odwiedzającego.

Zestawienie ma charakter informacyjny i nie jest oficjalnym serwisem Oazy Czytelników ani organizatorów konkursów.
