# Cennik legend — plan wdrożenia krok po kroku

## Cel

Dodać stronę `/dashboard/cennik`, która pokazuje stałe ceny legendarnych przedmiotów możliwych do zdobycia z aktualnie dostępnych w grze herosów i Elit II. Administratorzy mogą edytować ceny, natomiast metadane przedmiotów i przeciwników są synchronizowane z oficjalnymi poradnikami na forum Margonem.

## Założenia

- Źródłem danych są dwa stałe tematy prowadzone przez ekipę Garmory:
  - [Dane o Herosach](https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0)
  - [Dane o Elitach II](https://forum.margonem.pl/?task=forum&show=posts&id=514805&ps=0)
- Aktualny skład przeciwników wyznaczają wyłącznie kompletne, ustrukturyzowane wpisy poradnikowe oficjalnego konta w tych dwóch tematach.
- Ignorujemy odpowiedzi użytkowników, cytaty, komentarze, materiały eventowe oraz sekcje oznaczone jako archiwalne lub wycofane.
- Nie przeszukujemy innych tematów ani historycznych stron NPC.
- Importujemy wyłącznie legendarne elementy ekwipunku. Pomijamy skrzynki, runy, przedmioty questowe i konsumpcyjne.
- Jeden przedmiot ma jedną cenę, nawet jeśli wypada z wielu przeciwników lub z obu kategorii.
- Synchronizacja nigdy nie nadpisuje ceny ustawionej przez administratora.
- Nieudana lub niepełna synchronizacja nie dezaktywuje istniejących danych.
- Przed implementacją należy potwierdzić jednostkę i precyzję ceny.

## Format danych źródłowych

Forum umieszcza dane przedmiotów bezpośrednio w HTML. Element wyposażenia ma ikonę CDN oraz atrybut podobny do:

```html
<img
  src="https://micc.garmory-cdn.cloud/obrazki/itemy/pie/pierscien1319.gif"
  stats="Nazwa||binds;lvl=231;rarity=legendary;reqp=bh;legbon=critred,231||12||427178"
  ctip="item"
/>
```

Atrybut `stats` zawiera cztery części:

1. nazwę przedmiotu;
2. statystyki rozdzielone średnikami;
3. klasę/typ przedmiotu;
4. źródłową wartość gry, która nie jest identyfikatorem i nie jest ceną zarządzaną przez aplikację.

Źródłową tożsamością przedmiotu będzie znormalizowana ścieżka ikony z CDN. Nazwa, poziom i klasa będą używane jako odcisk diagnostyczny wykrywający nieoczekiwane zmiany.

## Krok 1: pobieranie tematów forum

1. Utworzyć moduł forum Margonem w:

   ```text
   packages/api/src/adapters/legend-pricing/margonem-forum/
   ```

2. Dodać pobieranie obu stałych adresów przez Effect HTTP Client.
3. Ustawić:
   - opisowy User-Agent;
   - timeout;
   - ograniczone ponowienia tylko dla błędów przejściowych;
   - maksymalny akceptowany rozmiar odpowiedzi;
   - oczekiwany typ treści HTML.
4. Rozpoznawać strony blokady, komunikat „Momencik”, stronę logowania i niekompletny HTML jako błędy źródła.
5. Nie używać Firecrawl, jeśli bezpośrednia odpowiedź zawiera pełne dane. Firecrawl może być rozważony dopiero wtedy, gdy bezpośredni dostęp przestanie być niezawodny.
6. Dodać syntetyczne fixture odpowiedzi poprawnej, blokady, pustej strony i zmienionego formatu.

### Kryterium ukończenia

Każdy temat jest pobierany jako pełny dokument HTML albo synchronizacja kończy się typowanym błędem bez zmiany katalogu.

## Krok 2: odseparowanie oficjalnych wpisów poradnikowych

1. Podzielić stronę forum na kontenery pojedynczych postów.
2. Przetwarzać tylko wpisy oficjalnego konta prowadzącego poradnik, identyfikowanego stabilnym profilem/autorem oraz oznaczeniem ekipy Garmory.
3. Dodatkowo wymagać struktury wpisu poradnikowego:
   - nagłówka `HEROSI` albo `ELITY II`, lub jednoznacznego bloku przeciwnika;
   - nazwy i poziomu przeciwnika;
   - ikony NPC z CDN;
   - sekcji `Szablon zdobyczy`;
   - co najmniej jednego elementu z `ctip="item"` i atrybutem `stats`.
4. Ignorować:
   - posty innych użytkowników;
   - cytaty z poradnika umieszczone w odpowiedziach;
   - zgłoszenia poprawek i dyskusje;
   - podpisy, awatary i grafiki forum;
   - sekcje skrzyń, outfitów i wymian znajdujące się poza właściwym szablonem zdobyczy.
5. Deduplikować oficjalne wpisy według ID posta, aby cytowany lub powtórzony HTML nie utworzył dodatkowych danych.
6. Jeśli zmieni się identyfikator oficjalnego autora lub struktura postów, przerwać synchronizację i wymagać aktualizacji parsera zamiast przetwarzać wszystkie posty.
7. Dodać testy rozróżniające oficjalny wpis, zwykłą odpowiedź, cytat oraz odpowiedź zawierającą ikonę przedmiotu.

### Kryterium ukończenia

Parser nie może potraktować komentarza użytkownika ani cytatu jako części aktualnego katalogu.

## Krok 3: parser przeciwników i przedmiotów

1. Podzielić oficjalne wpisy na bloki pojedynczych przeciwników.
2. Dla każdego przeciwnika wyodrębnić:
   - kategorię `hero` albo `elite2`;
   - nazwę;
   - poziom;
   - profesję, jeśli jest podana;
   - ikonę NPC;
   - ID źródłowego posta;
   - URL tematu.
3. Jako klucz źródłowy przeciwnika przyjąć kategorię oraz znormalizowaną ścieżkę ikony NPC. Nazwa i poziom stanowią odcisk diagnostyczny.
4. W obrębie właściwej sekcji `Szablon zdobyczy` znaleźć elementy `ctip="item"` z ikoną i atrybutem `stats`.
5. Bezpiecznie zdekodować encje HTML i podzielić `stats` na cztery oczekiwane części.
6. Rozbić część statystyk na jawne atrybuty klucz/wartość.
7. Zachować wyłącznie rekordy zawierające `rarity=legendary`.
8. Na podstawie klasy, ścieżki ikony i statystyk odrzucić:
   - Smocze Runy;
   - pojemniki i skrzynki;
   - przedmioty konsumpcyjne;
   - przedmioty questowe;
   - outfity i składniki outfitów;
   - inne przedmioty niebędące wyposażeniem.
9. Dla każdej legendy wyodrębnić:
   - znormalizowaną ścieżkę ikony jako klucz źródłowy;
   - nazwę;
   - pełny URL ikony;
   - poziom z `lvl`;
   - typ/slot z klasy przedmiotu;
   - wymagane profesje z `reqp`;
   - bonus legendarny z `legbon`;
   - klucz przeciwnika.
10. Nie używać ostatniego pola `stats` jako identyfikatora ani ceny aplikacji.
11. Odrzucać cały blok przeciwnika, jeśli nie można jednoznacznie ustalić jego granic lub powiązać przedmiotów z właściwym `Szablonem zdobyczy`.
12. Dodać testy:
    - poprawnego i uszkodzonego `stats`;
    - brakującej rzadkości lub poziomu;
    - apostrofów i encji HTML w nazwach;
    - nieznanej klasy;
    - wszystkich reguł wykluczenia;
    - dwóch przeciwników w jednym poście;
    - dodatkowych sekcji skrzyń i outfitów po szablonie zdobyczy.

### Kryterium ukończenia

Parser zwraca wyłącznie aktualne legendarne elementy wyposażenia przypisane do właściwych herosów lub Elit II.

## Krok 4: model domenowy

1. Utworzyć:

   ```text
   packages/api/src/domain/legend-pricing/
   ```

2. Zdefiniować przez Effect Schema:
   - wewnętrzne identyfikatory przedmiotu i przeciwnika;
   - klucz źródłowy ikony przedmiotu;
   - klucz źródłowy ikony przeciwnika;
   - ID posta forum;
   - kategorię przeciwnika `hero | elite2`;
   - poziomy przedmiotu i przeciwnika;
   - typ wyposażenia;
   - profesje;
   - bonus legendarny;
   - cenę jako nieujemną wartość o potwierdzonej precyzji;
   - aktywność rekordu;
   - wynik synchronizacji i jego błędy.
3. Umieścić normalizowanie ścieżek CDN i reguły kwalifikowania wyposażenia w module domenowym.
4. Dodać testy inwariantów ceny, poziomów, kluczy źródłowych, normalizacji URL i klasyfikacji wyposażenia.

### Kryterium ukończenia

Nieprawidłowe klucze źródłowe, poziomy, ceny i typy przedmiotów nie mogą przedostać się do usług aplikacyjnych.

## Krok 5: schemat bazy danych

1. Dodać `packages/db/src/schema/legend-pricing.ts`.
2. Utworzyć tabelę `legendary_items` z polami:
   - wewnętrzny klucz główny;
   - unikalny znormalizowany klucz ikony źródłowej;
   - nazwa;
   - poziom;
   - typ wyposażenia;
   - pełny URL ikony;
   - profesje;
   - bonus legendarny;
   - odcisk diagnostyczny;
   - stan aktywności;
   - znaczniki czasu synchronizacji.
3. Utworzyć tabelę `legendary_enemies` z polami:
   - wewnętrzny klucz główny;
   - unikalna para kategorii i znormalizowanej ścieżki ikony NPC;
   - kategoria `hero` albo `elite2`;
   - nazwa;
   - poziom;
   - pełny URL ikony;
   - ID źródłowego posta;
   - URL tematu;
   - odcisk diagnostyczny;
   - stan aktywności;
   - `lastSeenAt`.
4. Utworzyć tabelę łączącą `legendary_item_drops` z unikalną parą przedmiot–przeciwnik.
5. Utworzyć tabelę `legendary_item_costs` z polami:
   - unikalny identyfikator przedmiotu;
   - cena;
   - `updatedAt`;
   - `updatedBy`;
   - wersja do ochrony przed jednoczesną edycją.
6. Utworzyć tabelę lub odpowiedni zapis przebiegów synchronizacji z wynikiem, licznikami i czasem ostatniego sukcesu.
7. Dodać indeksy dla kategorii, aktywności, poziomu, nazwy, typu i profesji zgodnie z faktycznymi zapytaniami.
8. Wyeksportować schemat z `packages/db/package.json`.
9. Wygenerować migrację przez istniejące polecenie Drizzle i sprawdzić wygenerowany SQL.

### Kryterium ukończenia

Baza wymusza unikalność kluczy źródłowych, relacji dropów oraz pojedynczej ceny dla przedmiotu.

## Krok 6: adapter trwałości i uzgadnianie danych

1. Utworzyć port trwałości w:

   ```text
   packages/api/src/services/legend-pricing/
   ```

2. Zaimplementować adapter Drizzle w:

   ```text
   packages/api/src/adapters/legend-pricing/
   ```

3. Uzgadniać przedmioty według znormalizowanej ścieżki ikony CDN, a przeciwników według kategorii i ścieżki ikony NPC — nigdy wyłącznie według nazwy.
4. Przed rozpoczęciem transakcji pobrać, odseparować i sparsować oba kompletne tematy.
5. W krótkiej transakcji:
   - upsertować przeciwników;
   - upsertować przedmioty;
   - odtworzyć aktualne relacje dropów;
   - oznaczyć jako nieaktywnych przeciwników nieobecnych w najnowszym kompletnym poradniku;
   - ustawić aktywność przedmiotu na podstawie co najmniej jednego aktywnego źródła dropu;
   - zapisać udany przebieg synchronizacji.
6. Nie usuwać rekordów i nie modyfikować tabeli cen podczas synchronizacji.
7. Nowo odkryty przedmiot pozostawić bez ceny.
8. Jeśli istniejący klucz ikony otrzyma niezgodną nazwę, poziom lub klasę, zatrzymać publikację tego rekordu i zgłosić drift do ręcznego uzgodnienia.
9. Jeśli ikona zostanie zmieniona i pojawi się podobny przedmiot, nie łączyć go automatycznie po nazwie.
10. Dodać testy integracyjne rzeczywistej migracji i bazy PostgreSQL.

### Kryterium ukończenia

Ponowna synchronizacja jest idempotentna, zachowuje ceny i dezaktywuje dane wyłącznie po kompletnym, poprawnym przetworzeniu oficjalnych poradników.

## Krok 7: bezpieczny proces synchronizacji

1. Utworzyć usługę synchronizującą katalog.
2. Zapobiec dwóm równoległym synchronizacjom.
3. Przed zapisaniem wyniku sprawdzić:
   - czy oba tematy zostały pobrane w pełnej wersji z `ps=0`;
   - czy znaleziono oczekiwane oficjalne wpisy;
   - czy znaleziono obie kategorie;
   - czy każdy zaakceptowany przeciwnik ma poprawny nagłówek i szablon zdobyczy;
   - czy nie ma duplikatów kluczy źródłowych;
   - czy liczba przeciwników i legend nie spadła podejrzanie względem ostatniego udanego przebiegu;
   - czy wynik żadnej kategorii nie jest pusty;
   - czy nie wykryto niezaakceptowanego driftu.
4. Cały wynik odrzucić, jeśli choć jeden warunek kompletności nie jest spełniony.
5. Zapisać podsumowanie przebiegu:
   - czas rozpoczęcia i zakończenia;
   - status;
   - identyfikatory i daty edycji przetworzonych oficjalnych postów;
   - liczbę przeciwników i przedmiotów;
   - liczbę aktywowanych i dezaktywowanych rekordów;
   - bezpieczne informacje o błędach.
6. Utworzyć osobny punkt uruchomieniowy, np.:

   ```text
   apps/server/src/sync-legend-catalog.ts
   ```

7. Nie uruchamiać synchronizacji podczas startu serwera ani w zwykłym żądaniu strony.
8. Skonfigurować zewnętrzny harmonogram, początkowo raz w tygodniu.

### Kryterium ukończenia

Awaria forum, strona blokady, odpowiedź wymagająca logowania lub zmiana HTML pozostawia ostatni poprawny katalog bez zmian i jest widoczna w diagnostyce.

## Krok 8: kontrakt HTTP i autoryzacja

1. Dodać:

   ```text
   packages/api/src/protocol/legend-pricing/http-api-contract.ts
   packages/api/src/server/legend-pricing/http-api-handlers.ts
   ```

2. Dodać endpoint `listLegendPrices` dla zweryfikowanych użytkowników.
3. Zwracać tylko przedmioty posiadające aktywne źródło dropu, wraz z:
   - metadanymi przedmiotu;
   - ceną lub stanem `Brak ceny`;
   - aktywnymi źródłami dropu;
   - czasem ostatniej synchronizacji i aktualizacji ceny.
4. Dodać endpoint `updateLegendCost` dostępny wyłącznie administratorom.
5. Przy aktualizacji ceny:
   - sparsować identyfikator i cenę;
   - sprawdzić oczekiwaną wersję rekordu;
   - odrzucić nieaktualną równoległą edycję;
   - zapisać administratora i czas zmiany.
6. Zarejestrować moduł w:
   - `packages/api/src/protocol/http-api-contract.ts`;
   - `packages/api/src/server/http-api-handlers.ts`;
   - `packages/api/src/server/effect-app.ts`.
7. Dodać testy kontraktu, mapowania błędów oraz autoryzacji administratora.

### Kryterium ukończenia

Zweryfikowany użytkownik może odczytać cennik, a tylko administrator może zmienić cenę.

## Krok 9: stan klienta webowego

1. Utworzyć:

   ```text
   apps/web/src/features/legend-pricing/legend-pricing-atoms.ts
   ```

2. Dodać atom zasobu pobierający cennik.
3. Dodać atom mutacji ceny.
4. Po udanej zmianie odświeżyć lub optymistycznie zaktualizować odpowiedni rekord.
5. Zachować stany ładowania i błędu zgodnie z istniejącymi konwencjami `AsyncResultBoundary`.
6. Dodać testy odczytu, aktualizacji, odświeżenia i błędów mutacji.

### Kryterium ukończenia

Stan klienta obsługuje odczyt i administracyjną edycję bez ukrywania błędów lub pozostawiania nieaktualnej ceny.

## Krok 10: trasa i nawigacja

1. Utworzyć:

   ```text
   apps/web/src/routes/dashboard/cennik.tsx
   apps/web/src/routes/dashboard/-components/cennik-page.tsx
   ```

2. W loaderze trasy wstępnie pobrać atom cennika.
3. Dodać breadcrumb `Cennik legend`.
4. Dodać pozycję `Cennik legend` w `apps/web/src/components/dashboard-navigation.ts`.
5. Zachować istniejące wymaganie zweryfikowanej sesji dashboardu.

### Kryterium ukończenia

Strona jest dostępna pod `/dashboard/cennik`, widoczna w nawigacji i korzysta ze standardowych stanów ładowania oraz błędów.

## Krok 11: interfejs strony

1. Grupować przedmioty według przeciwnika niezależnie od jego kategorii.
2. Użyć ikony przeciwnika jako wyróżnika grupy, a jego nazwę i poziom pokazać nad ikoną.
3. Przedmiot wypadający z wielu przeciwników pokazywać w każdej właściwej grupie, ale z tą samą ceną.
4. Obok ikony przeciwnika wyświetlać wszystkie przypisane do niego legendarne przedmioty wraz z:
   - ikoną i nazwą;
   - poziomem przedmiotu;
   - typem wyposażenia;
   - profesjami;
   - bonusem legendarnym;
   - stałą ceną albo `Brak ceny`;
   - czasem ostatniej aktualizacji ceny.
5. Udostępnić filtry:
   - nazwa przedmiotu;
   - nazwa przeciwnika;
   - dokładny poziom przedmiotu;
   - typ przeciwnika (`Heros` albo `Elita II`).
6. Przechowywać filtry w parametrach wyszukiwania URL.
7. Sortować grupy przeciwników rosnąco według poziomu, a przy równych poziomach według nazwy.
8. Zapewnić responsywny widok grup oraz semantyczne etykiety kontrolek.
9. Dla administratorów przy każdym przedmiocie udostępnić pole ceny z:
   - kontrolką zapisu;
   - walidacją;
   - stanem oczekiwania;
   - komunikatem powodzenia lub błędu;
   - obsługą konfliktu równoległej edycji.
10. Ukrycie kontrolek dla zwykłego użytkownika traktować wyłącznie jako UX; bezpieczeństwo pozostaje po stronie backendu.

### Kryterium ukończenia

Użytkownik może znaleźć legendę według nazwy przedmiotu, nazwy przeciwnika, poziomu przedmiotu lub typu przeciwnika, grupy są uporządkowane rosnąco według poziomu przeciwnika, a administrator może bezpiecznie ustawić cenę bezpośrednio w grupie przeciwnika.

## Krok 12: testy końcowe

1. Uruchomić testy parserów forum Margonem.
2. Uruchomić testy domenowe i usług synchronizacji.
3. Uruchomić testy integracyjne bazy i migracji.
4. Uruchomić testy kontraktu HTTP i autoryzacji.
5. Uruchomić testy atomów oraz interfejsu strony.
6. Potwierdzić ręcznie:
   - brak historycznych, eventowych i wycofanych przeciwników;
   - ignorowanie komentarzy i cytatów użytkowników;
   - import wyłącznie `rarity=legendary` z właściwych szablonów zdobyczy;
   - wykluczenie run, skrzynek, przedmiotów questowych i outfitów;
   - zachowanie ceny po ponownej synchronizacji;
   - dezaktywację przeciwnika usuniętego z oficjalnego poradnika;
   - pozostawienie przedmiotu aktywnego, jeśli nadal wypada z innego aktywnego przeciwnika;
   - widoczność nowych pozycji bez ceny dla administratora.
7. Uruchomić:

   ```bash
   pnpm check-types
   pnpm test
   pnpm test:integration
   pnpm dlx ultracite check
   ```

## Definicja ukończenia

Funkcja jest ukończona, gdy `/dashboard/cennik` pokazuje wyłącznie legendarne wyposażenie z aktualnych oficjalnych wpisów o herosach i Elitach II na forum Margonem, ceny są niezależne od synchronizacji i edytowalne wyłącznie przez administratorów, komentarze użytkowników nie wpływają na katalog, a nieudany import nie może usunąć ani dezaktywować ostatniego poprawnego katalogu.
