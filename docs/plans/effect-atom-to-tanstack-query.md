# Migracja Effect Atom do TanStack Query

Status: karty 00–01 zakończone. Następna jest karta 02: QueryClient, provider i wsparcie testów.

## Cel i zakres

Docelowy przepływ:

```text
React → TanStack Query → feature API adapter → Effect HttpApiClient → backend
```

Query jest właścicielem server state. TanStack Router pozostaje właścicielem parametrów URL, TanStack Form formularzy, a React lokalnego stanu UI i szkiców edycji. Effect zostaje w kontraktach, parsowaniu, kliencie HTTP i backendzie.

Nie dodawaj Zustand, nowego globalnego Contextu stanu ani własnego odpowiednika AsyncResult. Nie przenoś komponentów z `routes/` do `features/` przy okazji. Nie zmieniaj backendu, kontraktów, reguł biznesowych ani ustawień SSR dashboardu.

## Co faktycznie jest w repo

Inspekcja na potrzeby planu:

- `apps/web/package.json` ma `@effect/atom-react` w wersji `4.0.0-beta.101` i nie ma `@tanstack/react-query`. Atom i AsyncResult pochodzą z `effect/unstable/reactivity`, nie z pakietów `@effect-atom/*`.
- Jest 17 modułów `*atoms.ts`, wymienionych w zadaniach poniżej.
- `src/lib/http-api-client-runtime.ts` łączy `AppHttpApiClient.layer` z `Atom.runtime`. Klient używa `credentials: "include"`.
- Health ma osobny kontrakt i runtime w `src/lib/health-http-api-client-runtime.ts`. Zachowaj tę niezależność.
- `src/router.tsx` tworzy registry dla instancji routera. `routes/__root.tsx` udostępnia go przez `RegistryContext`.
- `src/lib/atom-preload.ts` uruchamia niezależne zasoby równolegle, wykorzystuje sukces z cache i ponawia wcześniej nieudany odczyt.
- `routes/dashboard/route.tsx` ma `ssr: false`. Autoryzacja tras używa `getUser` i kontekstu sesji, niezależnie od `sessionAtom`.
- Publiczna trasa `routes/index.tsx` preloaduje health i nie wyłącza SSR.
- `features/events/core/use-event-hero-filter.ts` już przechowuje filtry w Router search. Atom dostarcza tam dane list, nie stan URL.
- Optimistic updates istnieją w todos, announcements, auctions, events, heroes, skills i vault.
- Squad builder ma invalidację między modułami, zapisy z `expectedUpdatedAt: Date`, disabled queries i pięciominutowe idle TTL.
- `components/ui/async-result-boundary.tsx` zachowuje dane podczas odświeżania i pokazuje polskie komunikaty błędów. Nie wolno zastąpić błędu pustą listą.
- Testy używają prawdziwego `HttpApiClient` nad kontrolowanym `HttpClient`, przez `lib/test-utils/atom-test-utils.ts`. Zachowaj ten punkt podmiany.

To jest mapa startowa, nie kompletny audyt komponentów. Agent każdego zadania musi przeczytać cały aktualny moduł, jego konsumentów i testy przed zmianą.

## Wynik karty 00

### Inwentaryzacja konsumentów

W repozytorium jest 17 modułów `*atoms.ts`. Wszystkie ich czytniki, zapisujący i loadery są poniżej. Importy typów też są uwzględnione, bo po migracji nie mogą zostawić martwych eksportów atomowych.

- `health`: `routes/index.tsx`, `routes/-components/home-page.tsx`.
- `todos`: `routes/dashboard/tasks.tsx`, `routes/dashboard/-components/tasks-page.tsx`, `lib/effect-atom-failure.test.ts`.
- `users`: `routes/-components/waiting-room-page.tsx`, `routes/dashboard/-components/players-table/columns.tsx`, `routes/dashboard/-components/edit-profile-modal.tsx`, `routes/dashboard/-components/player-list-page.tsx`, `routes/dashboard/player-list.tsx`, `routes/dashboard/events/-components/history/edit-bet-modal.tsx`, `routes/dashboard/events/-components/bets-add-page.tsx`, `routes/dashboard/events/bets.add.tsx`, `routes/dashboard/squad-builder/-components/accounts/account-sharing-panel.tsx`.
- `announcements`: `routes/dashboard/index.tsx`, `routes/dashboard/-components/announcements-page.tsx`, `routes/dashboard/-components/add-announcement-modal.tsx`, `lib/effect-atom-failure.test.ts`.
- `legend-pricing`: `routes/dashboard/cennik.tsx`, `routes/dashboard/-components/cennik-page.tsx`, `routes/dashboard/-components/cennik-groups.ts`, `routes/dashboard/-components/cennik-search.test.tsx`, `routes/dashboard/-components/cennik-groups.test.ts`.
- `auctions`: `routes/dashboard/auctions/$type/$profession.tsx`, `routes/dashboard/auctions/$type/-components/auction-table.tsx`, `routes/dashboard/auctions/$type/-components/auction-header.tsx`, `features/auctions/auction-atoms.test.ts`, `lib/effect-atom-failure.test.ts`.
- `skills`: `routes/dashboard/skills/index.tsx`, `routes/dashboard/skills/-components/skills-index-page.tsx`, `routes/dashboard/skills/$rangeName/route.tsx`, `routes/dashboard/skills/$rangeName/-range-details.tsx`, `routes/dashboard/skills/-components/range-card.tsx`, `routes/dashboard/skills/-components/add-range-modal.tsx`, `routes/dashboard/skills/-components/add-profession-modal.tsx`, `routes/dashboard/skills/$rangeName/-components/add-skill-modal.tsx`, `features/skills/skill-atoms.test.ts`, `lib/effect-atom-failure.test.ts`.
- `events/core`: `routes/dashboard/events/list.tsx`, `routes/dashboard/events/-components/list-page.tsx`, `routes/dashboard/events/heroes.tsx`, `routes/dashboard/events/-components/heroes-page.tsx`, `routes/dashboard/events/history.tsx`, `routes/dashboard/events/-components/history-page.tsx`, `routes/dashboard/events/ranking.tsx`, `routes/dashboard/events/-components/ranking-page.tsx`, `routes/dashboard/events/vault.tsx`, `routes/dashboard/events/-components/vault-page.tsx`, `routes/dashboard/events/bets.add.tsx`, `routes/dashboard/events/-components/bets-add-page.tsx`, `routes/dashboard/events/-components/list/add-event-modal.tsx`, `routes/dashboard/events/-components/heroes/add-hero-modal.tsx`, `routes/dashboard/events/-components/ranking/distribute-gold-modal.tsx`, `features/events/core/use-event-hero-filter.ts`, `lib/effect-atom-failure.test.ts`.
- `events/heroes`: `routes/dashboard/events/heroes.tsx`, `routes/dashboard/events/-components/heroes-page.tsx`, `routes/dashboard/events/bets.add.tsx`, `routes/dashboard/events/-components/bets-add-page.tsx`, `routes/dashboard/events/-components/heroes/add-hero-modal.tsx`, `routes/dashboard/events/-components/ranking/distribute-gold-modal.tsx`, `features/events/core/use-event-hero-filter.ts`, `features/events/heroes/hero-atoms.test.ts`, `lib/effect-atom-failure.test.ts`.
- `events/bets`: `routes/dashboard/events/-components/history-page.tsx`, `routes/dashboard/events/-components/bets-add-page.tsx`, `routes/dashboard/events/-components/bets-add-form.tsx`, `routes/dashboard/events/-components/history/edit-bet-modal.tsx`, `features/events/bets/bet-atoms.test.ts`, `lib/effect-atom-failure.test.ts`.
- `events/ranking`: `routes/dashboard/events/ranking.tsx`, `routes/dashboard/events/-components/ranking-page.tsx`, `routes/dashboard/events/-components/ranking/use-ranking-data.ts`, `routes/dashboard/events/-components/ranking/distribute-gold-modal.tsx`, `routes/dashboard/events/vault.tsx`, `routes/dashboard/events/-components/vault-page.tsx`, `features/events/ranking/ranking-atoms.test.ts`, `features/events/vault/vault-atoms.test.ts`, `lib/effect-atom-failure.test.ts`.
- `events/vault`: `routes/dashboard/events/vault.tsx`, `routes/dashboard/events/-components/vault-page.tsx`, `routes/dashboard/events/-components/ranking/distribute-gold-modal.tsx`, `features/events/vault/vault-atoms.test.ts`, `lib/effect-atom-failure.test.ts`.
- `squad-builder/account-import`: `routes/dashboard/squad-builder/accounts.tsx`, `routes/dashboard/squad-builder/-components/accounts-page.tsx`, `routes/dashboard/squad-builder/-components/accounts/account-import-frame.tsx`, `routes/dashboard/squad-builder/-components/accounts/owned-account-management-row.tsx`, `features/squad-builder/account-import-atoms.test.ts`, `features/squad-builder/account-refetch-atoms.test.ts`.
- `squad-builder/account-sharing`: `routes/dashboard/squad-builder/accounts.tsx`, `routes/dashboard/squad-builder/-components/accounts/account-access-frame.tsx`, `routes/dashboard/squad-builder/-components/accounts/account-sharing-panel.tsx`, `features/squad-builder/account-import-atoms.ts`, `features/squad-builder/sharing-atoms.test.ts`.
- `squad-builder/account-refetch`: `routes/dashboard/squad-builder/-components/accounts/account-refetch-workflow.tsx`, `features/squad-builder/account-refetch-atoms.test.ts`.
- `squad-builder/squad-groups`: `routes/dashboard/squad-builder/squads.tsx`, `routes/dashboard/squad-builder/squads_.$groupId.tsx`, `routes/dashboard/squad-builder/-components/squads/squad-group-library.tsx`, `routes/dashboard/squad-builder/-components/squads/create-squad-group-frame.tsx`, `routes/dashboard/squad-builder/-components/squad-editor-page.tsx`, `routes/dashboard/squad-builder/-components/squad-editor/available-character-pool.tsx`, `routes/dashboard/squad-builder/-components/squad-editor/squad-group-settings.tsx`, `features/squad-builder/account-import-atoms.ts`, `features/squad-builder/account-sharing-atoms.ts`, `features/squad-builder/account-refetch-atoms.ts`, `features/squad-builder/squad-group-atoms.test.ts`, `lib/effect-atom-failure.test.ts`.
- `squad-builder/squad-group-sharing`: `routes/dashboard/squad-builder/squads.tsx`, `routes/dashboard/squad-builder/-components/squads/squad-group-library.tsx`, `routes/dashboard/squad-builder/-components/squads/squad-group-invitations.tsx`, `routes/dashboard/squad-builder/-components/squad-editor/squad-group-settings.tsx`, `features/squad-builder/sharing-atoms.test.ts`.

Route loadery, które dziś używają `preloadAtomResults`, to `/` dla health, dashboard home, tasks, player list i cennik, eventy list/heroes/history/bets add/ranking/vault, aukcje po typie i profesji, lista oraz szczegół umiejętności, a także listy i szczegół grup składów. `dashboard` ma `ssr: false` i jego `beforeLoad` robi wyłącznie guard sesji.

### Macierz invalidacji

Poniższe nazwy opisują docelowe rodziny kluczy Query. Brakujący parametr jest częścią klucza jako `undefined` albo znormalizowane `null`, zgodnie z kontraktem. Gdy mutacja nie zwraca identyfikatora rodzica, invalidacja obejmuje całą rodzinę zamiast próbować zgadywać filtr.

| Operacja | Cache do invalidacji |
| --- | --- |
| health check | `health` |
| create, toggle, delete todo | `todos.list` |
| update profile | `users.session`, `users.list`, `users.verified` oraz aktywne cache z projekcją nazwy użytkownika |
| set verified, set role, update user name, delete user | `users.list`, `users.verified`, `users.session` dla bieżącego aktora oraz cache z projekcją nazwy, obrazu lub uprawnień użytkownika |
| verify Discord membership | `users.session` oraz route context sesji; po sukcesie router musi wykonać dotychczasowe `invalidate` |
| create/delete announcement | `announcements.list` |
| update legend cost | `legend-pricing.list` |
| toggle/remove auction signup dla `{ type, profession }` | `auctions.signups(type, profession)`, `auctions.stats(type, profession)` |
| create profession | `skills.professions` |
| create range | `skills.ranges` |
| create skill dla `rangeId` | `skills.byRange(rangeId)` |
| delete range | `skills.ranges`, wszystkie pasujące `skills.range(slug)` i `skills.byRange(rangeId)` |
| delete skill | wszystkie pasujące `skills.byRange(rangeId)`; aktywny range musi zostać przekazany albo invalidowany predykatem |
| create event | `events.list` |
| toggle event active | `events.list` |
| delete event | `events.list`, `heroes.list`, `heroes.byEvent(*)`, `bets.page(*)`, `bets.latestForCopy`, `ranking(*)`, `ranking.heroStats(*)`, `ranking.oldestUnpaidEvent`, `vault(*)`; usunięcie eventu kaskaduje w bazie do herosów, obstawień i statystyk |
| create hero dla `eventId` | `heroes.list`, `heroes.byEvent(eventId)` |
| delete hero | `heroes.list`, `heroes.byEvent(*)`, `bets.page(*)`, `bets.latestForCopy`, `ranking(*)`, `ranking.heroStats(*)`, `ranking.oldestUnpaidEvent`, `vault(*)`; usunięcie herosa kaskaduje do danych ledgeru |
| create, edit, delete bet | wszystkie `bets.page(*)`, `bets.latestForCopy`, `ranking(*)`, `ranking.heroStats(*)`, `ranking.oldestUnpaidEvent`, `vault(*)`; bet zmienia `userStats`, więc samo odświeżenie aktualnej strony historii nie wystarcza |
| distribute gold dla `heroId` | `ranking(*)` dla tego herosa, `ranking.heroStats(heroId)`, `vault(*)`, `ranking.oldestUnpaidEvent` |
| toggle paid-out dla `eventId` | `vault(eventId)`, `vault(*)`, `ranking.oldestUnpaidEvent` |
| confirm import account | `accounts.owned`, `groups.availableCharacters(*)` |
| rename owned account | `accounts.owned`, `accounts.shared` oraz `groups.detail(*)`, `groups.availableCharacters(*)`, `groups.global(*)` z projekcją tej nazwy |
| delete owned account | `accounts.owned`, `accounts.shared`, `accounts.incomingInvites`, `accounts.grants(accountId)`, `accounts.inviteTargets(accountId, *)`, `groups.owned`, `groups.shared`, `groups.global(*)`, `groups.detail(*)`, `groups.availableCharacters(*)` |
| send account access invite | `accounts.grants(accountId, actorUserId)`, `accounts.inviteTargets(accountId, *)`; cache odbiorcy zostanie odświeżone przy jego następnym przejściu auth/focus |
| accept/decline account invite | `accounts.incomingInvites`, `accounts.shared`, `groups.detail(*)`, `groups.availableCharacters(*)`, a po akceptacji także właściwe cache dostępu |
| revoke account access | `accounts.grants(accountId, actorUserId)`, `accounts.shared`, `groups.detail(*)`, `groups.availableCharacters(*)`; po revoke szczegół grupy nie może zostać edytowalny z cache |
| apply account refetch | `accounts.owned`, `accounts.shared`, `groups.owned`, `groups.shared`, `groups.global(*)`, `groups.detail(*)`, `groups.availableCharacters(*)` |
| create squad group | `groups.owned` |
| delete squad group | `groups.owned`, `groups.shared`, `groups.global(*)`, `groups.detail(groupId)`, `groups.availableCharacters(groupId)`, `groups.editorGrants(groupId)`, `groups.incomingInvites`, `groups.pendingInviteCount` |
| save owned/shared squad group | `groups.owned`, `groups.shared`, `groups.global(*)`, `groups.detail(groupId)`, `groups.availableCharacters(groupId)` |
| set group visibility | `groups.owned`, `groups.shared`, `groups.global(*)`, `groups.detail(groupId)`, `groups.availableCharacters(groupId)`, `groups.editorGrants(groupId)` |
| send squad editor invite | `groups.editorGrants(groupId)`, `groups.editorInviteTargets(groupId, *)`, `groups.pendingInviteCount` |
| accept/decline squad invite | `groups.incomingInvites`, `groups.shared`, `groups.pendingInviteCount`, `groups.detail(groupId)`, `groups.availableCharacters(groupId)` |
| revoke squad editor | `groups.editorGrants(groupId)`, `groups.shared`, `groups.incomingInvites`, `groups.pendingInviteCount`, `groups.detail(groupId)`, `groups.availableCharacters(groupId)` |

Invalidacja cache zawierających nazwę, obraz lub rolę użytkownika jest świadoma. Kontrakty ranking, vault, bets, aukcji, kont i grup zwracają te projekcje. Implementacja zadania 05 musi albo objąć te rodziny, albo udokumentować lokalną aktualizację danych, zamiast zostawiać stare nazwy bez decyzji.

### Sesja i auth

- `getUser` z Better Auth pozostaje źródłem prawdy dla guardów tras. Query cache nie może sam udzielać dostępu do dashboardu.
- `sessionAtom` jest obecnie drugą kopią sesji używaną przez `account-sharing-panel.tsx` oraz `verifyDiscordGuildMembershipAtom`. W zadaniu 05 oba miejsca przechodzą na `users.session`, a sukces weryfikacji nadal odświeża route context.
- Właścicielem prywatnego cache będzie `QueryClient` utworzony dla konkretnej instancji routera. Nie będzie singletonu ani zapisu do `localStorage`.
- Przejście logoutu ma anulować odczyty i wyczyścić prywatny cache przed nawigacją. Obecne miejsca do podłączenia to `components/sidebar/app-sidebar.tsx` i `routes/-components/waiting-room-page.tsx`. Login zachowa kolejność `invalidate`, a potem nawigacja, lecz musi korzystać z tego samego QueryClientu.
- Route context sesji jest używany przez dashboard, profil, sidebar, waiting room i strony eventów. Po zmianie profilu albo statusu weryfikacji trzeba odświeżyć także ten kontekst, nie tylko query `users.session`.

### Weryfikacja zależności i SSR

W baseline z lockfile efektywnie zainstalowano `@tanstack/react-router` `1.170.32` i `@tanstack/react-start` `1.168.49`. `@tanstack/react-query` nie jest jeszcze zainstalowany. Sprawdzenie rejestru wykazało:

- `@tanstack/react-query` `5.102.8`, z peerem React `^18 || ^19`;
- oficjalny `@tanstack/react-router-ssr-query` `1.167.2`, który wymaga `@tanstack/react-query` i `@tanstack/query-core` `>=5.102.0` oraz Routera `>=1.127.0`;
- `@tanstack/router-query` nie istnieje.

`@tanstack/react-router-ssr-query` jest zgodny z wersjami z lockfile. Jego `setupRouterSsrQueryIntegration` podpina `dehydrate` i `hydrate` Routera do QueryClientu oraz może założyć `QueryClientProvider`. Zadanie 02 ma użyć tej integracji zamiast własnego transportu cache SSR. Runtime Effect ani klient HTTP nie mogą trafić do payloadu dehydracji.

### Baseline

Stan przed migracją: `main...origin/main [ahead 1]`. Jedynym nieśledzonym plikiem był plan migracji, bez cudzych zmian implementacyjnych.

- `pnpm check`: zaliczone.
- `pnpm --filter web check-types`: zaliczone.
- `pnpm --filter web test`: 49 plików, 251 testów zaliczonych.
- Nie stwierdzono istniejących błędów lintowania, formatowania, typów ani testów.

Karta 00 nie zmieniła kodu aplikacji. Zaktualizowała ten plan o inwentaryzację, macierz invalidacji, politykę sesji, wybór integracji SSR i wyniki baseline.

### Wynik karty 01 — klient API niezależny od Atom

- `http-api-client-runtime.ts` i `health-http-api-client-runtime.ts` zawierają teraz wyłącznie usługi klientów oraz ich live layers; nie importują reactivity.
- `atom-http-api-runtime.ts` i `health-atom-runtime.ts` są tymczasową warstwą zgodności dla niezmigrowanych atomów. Ich konsumentów przełączono na te moduły, a warstwa testowa atomów nadal używa prawdziwego `HttpApiClient` z kontrolowanym `HttpClient`.
- `effect-promise.ts` udostępnia runner wykonywany per wywołanie. `Effect.runPromiseExit` zamyka scope po zakończeniu, przekazuje `AbortSignal`, odrzuca Promise bez owijania typed failures w `FiberFailure`, mapuje samo przerwanie na `AbortError`, a defekty przekazuje bez zmian.
- Live klient aplikacyjny dekoduje także semantyczne błędy z odpowiedzi 4xx/5xx, których nie da się przypisać do pojedynczego statusu przez obecne protokołowe unie błędów. Używa wspólnego `HttpApiError`; zła odpowiedź pozostaje błędem klienta i nie staje się sukcesem.
- Dodano `effect-promise.test.ts`: sukces i cookies, błąd protokołu, zła odpowiedź, defekt, anulowanie transportu oraz health z niezależnym layerem.
- Zmieniono 17 modułów atomów wyłącznie w zakresie importu tymczasowego runtime. Nie dodano jeszcze Query ani zmiany routera.

Dowody karty 01: `pnpm check`, `pnpm --filter web check-types` oraz `pnpm --filter web test` — 50 plików i 257 testów zaliczonych.

## Zasady techniczne do ustalenia raz

### Granica Effect → Promise

- Oddziel warstwy klientów od integracji z Atom. Nie twórz drugiego kontraktu ani ręcznego klienta fetch.
- Adapter API feature'a odpowiada za parsowanie wejścia, wywołanie typed clienta i przejście do Promise. Query options odpowiadają za klucze i cache, mutacje za invalidację.
- Zachowaj brandowane identyfikatory, daty i walidację kwot. Bez `as` zastępującego dekodowanie.
- Query wymaga odrzuconego Promise dla błędu. To świadoma granica frameworka, nie wzorzec dla reszty aplikacji. Zachowaj rozpoznawalne błędy protokołu dla `getErrorMessage`; osobno obsłuż anulowanie i defekty. Nie zakładaj zachowania `Effect.runPromise` w tej wersji beta bez testu.
- Przekaż `AbortSignal` z query function do wykonania Effect i HTTP. Test musi wykazać przerwanie transportu, nie tylko zmianę statusu Query.
- Żaden runtime nie może wykonywać I/O przy imporcie. Wybierz najmniejszy wariant wykonania Effect, który zapewnia poprawny lifetime. Jeżeli potrzebny jest trwały runtime, jego właściciel musi go zwalniać.
- Przed pisaniem Effect uruchom `effect-solutions list`, przeczytaj odpowiednie `effect-solutions show ...` oraz skill Effect. Zweryfikuj wzorce dla zainstalowanego Effect v4 beta.

### Cache i router

- Jedna instancja QueryClient dla instancji routera, wspólna dla loaderów i Reacta. Żadnego globalnego cache współdzielonego przez żądania SSR.
- Zachowaj `ssr: false` dashboardu. Dla publicznego health sprawdź oficjalną integrację Query z zainstalowanym TanStack Start/Router i transfer cache SSR. Nie pisz własnego mechanizmu hydration bez potrzeby.
- Wspólne query options muszą służyć loaderowi i komponentowi. Ustal jawnie `staleTime`, `gcTime`, retry oraz refetch on focus/reconnect. Atom idle TTL nie jest odpowiednikiem `staleTime`.
- Loader krytyczny ma przekazywać błąd do route error boundary. Nie używaj API prefetch połykającego błędy zamiast oczekiwania na wynik. Odróżnij wykorzystanie świeżego cache od odświeżenia invalidowanego cache.
- Zachowaj równoległe ładowanie niezależnych danych i możliwość ponowienia nieudanego loadera.
- Klucze zawierają wszystkie parametry wpływające na odpowiedź. Normalizuj brakujące filtry zgodnie z kontraktem. Nie przenoś `Data.Class` jako mechanizmu tożsamości kluczy Query.
- Zmiana użytkownika lub wylogowanie musi anulować stare odczyty i usunąć prywatne dane. Ochrona tras nadal opiera się na `getUser`, nie na samym cache Query.
- Nie zapisuj cache w localStorage. Nie dodawaj kluczy użytkownika bez ustalenia wspólnej polityki izolacji.

### Mutacje i UI

- Mutacje nie mają automatycznego retry. Dotyczy to szczególnie toggle, wypłat, importów i refetch profili.
- Invalidacja należy do definicji mutacji, nie tylko do callbacku przekazanego przez komponent. Ma działać także po odmontowaniu komponentu.
- Nie zamieniaj udanego zapisu w komunikat „zapis nieudany”, gdy zawiedzie późniejsze odświeżenie. Osobno obsłuż wynik komendy i błąd odczytu.
- Zachowaj obecne optimistic updates. Anuluj konkurujący odczyt przed zmianą cache; zapewnij rollback i końcowe uzgodnienie z serwerem.
- Rollback całej listy ze snapshotu nie może nadpisywać drugiej, udanej mutacji. Pilot musi ustalić i przetestować politykę współbieżności, zanim inne moduły ją skopiują.
- Disabled query nie oznacza ładowania. Brak wybranego eventu, hero, range lub group ma osobny stan UI; nie wysyłaj ID `0` i nie wkładaj fikcyjnych rekordów do cache.
- Zachowaj dane przy background refetch, informację o odświeżaniu, retry, empty state i dostępność komunikatów. Obsłuż błąd odświeżenia również wtedy, gdy istnieją starsze dane.
- Nie nadpisuj niezapisanego formularza lub szkicu squad editora przy refetchu.

## Jak dzielić pracę między małych agentów

Jedna karta poniżej to jedno zadanie. Jeżeli karta ma etapy A/B, uruchom je jako osobne zlecenia z przekazaniem wyników. Nie deleguj całego dokumentu jednemu agentowi z poleceniem implementacji wszystkiego.

Wspólna instrukcja wykonania każdego zadania feature'owego:

1. Przeczytaj wskazany plik, wszystkie jego importy u konsumentów, route loadery i powiązane testy. Znajdź również konsumentów samych eksportowanych typów.
2. Zapisz listę query inputs, wywołań API, obecnych refreshów i optimistic updates. Zidentyfikuj powiązane cache, których stary kod nie odświeżał. Nie traktuj starego refreshu jako pełnej specyfikacji.
3. Dodaj adapter API oraz query/mutation options zgodnie z pilotem. Użyj prefiksów domenowych w dużych feature'ach, np. `account-import-api.ts`, `account-import-queries.ts`. Nie wymuszaj trzech plików dla pojedynczego odczytu health.
4. Przenieś czytelników, zapisujących i loadery danego zasobu razem. Nie pozostawiaj dwóch aktywnych właścicieli tego samego server state.
5. Przenieś testy zachowania, usuń nieużywane eksporty atomowe, sprawdź wszystkie importy. Nie usuwaj testu tylko dlatego, że używa registry.
6. Uruchom walidację opisaną na końcu. Zgłoś zmienione pliki, dowody testowe, nierozwiązane ryzyka i następną kartę.

W okresie przejściowym oba providery mogą istnieć, ale obsługują rozłączne zasoby. Jeżeli stara mutacja zmienia zasób już przeniesiony do Query, w tej samej karcie przenieś tę mutację albo dodaj minimalny, jawnie opisany refresh drugiego cache w warstwie integracji. Taki tymczasowy kod musi mieć wskazaną kartę usunięcia. Nie buduj ogólnego mostu Atom ↔ Query.

Pliki współdzielone, manifest, lockfile, router i root mają jednego właściciela. Nie edytuj ich równolegle z kilku zadań.

## Karty wykonawcze

### 00. Inwentaryzacja i baseline

Zależności: brak.

1. Sprawdź stan gita i instrukcje repo. Nie zmieniaj cudzych zmian.
2. Zbierz wszystkie użycia `@effect/atom-react`, `effect/unstable/reactivity`, `AsyncResult`, `atomRegistry`, `preloadAtomResults`, helperów runtime i eksportów typów z atomów.
3. Dopisz do tego dokumentu tabelę operacja → cache do invalidacji, opartą również na konsumentach i kontraktach. Szczególnie events/bets/ranking/vault oraz squad builder.
4. Sprawdź ścieżki login/logout, odświeżenie route session i użycia Better Auth. Ustal właściciela resetu cache.
5. Uruchom baseline lint, typecheck i testów web. Zapisz istniejące błędy osobno.
6. Zweryfikuj wersje Query i ewentualnej oficjalnej integracji Router SSR przed wyborem zależności.

Odbiór: pełna lista konsumentów i invalidacji, polityka sesji, zanotowany baseline. Bez zmian implementacyjnych.

### 01. Klient API niezależny od Atom

Zależności: 00.

Pliki startowe: `lib/http-api-client-runtime.ts`, `lib/health-http-api-client-runtime.ts`, `lib/errors.ts`, `lib/branded-ids.ts`.

1. Oddziel definicje klientów i ich layerów od atom runtime. Pozostaw stare runtime jako tymczasowych konsumentów tych samych layerów.
2. Dodaj granicę wykonania Effect → Promise z sygnałem anulowania i kontrolowanym lifetime.
3. Zapewnij wstrzykiwanie testowego HttpClient/layer przez normalny punkt składania zależności.
4. Dodaj testy sukcesu, błędu protokołu, złej odpowiedzi, defektu, anulowania i cookies. Osobno sprawdź health bez aplikacyjnego klienta.

Odbiór: dotychczasowe atomy nadal działają; nowy adapter nie importuje reactivity; błędy zachowują bezpieczne polskie komunikaty.

### 02. QueryClient, provider i wsparcie testów

Zależności: 01.

Pliki: manifest web i lockfile, `router.tsx`, `routes/__root.tsx`, nowy `lib/query-client.ts`, wsparcie w `lib/test-utils/`.

1. Dodaj Query oraz tylko potrzebną oficjalną integrację SSR po weryfikacji wersji.
2. Utwórz QueryClient w composition root routera i udostępnij ten sam obiekt loaderom oraz Reactowi. Tymczasowo zachowaj registry.
3. Zapisz przy fabryce jawne ustawienia cache, retry i automatycznych refetchów, wybrane w 00.
4. Dodaj testowy QueryClient z kontrolowanym czasem i sprzątaniem. Wydziel z `atom-test-utils.ts` transport niezależny od registry, aby oba zestawy testów mogły używać prawdziwego dekodowania HttpApiClient.
5. Sprawdź izolację dwóch routerów/cache i brak I/O podczas importu.

Odbiór: brak zmiany dotychczasowych ekranów, działający test Query przez prawdziwy klient kontraktu, deterministyczny cleanup.

### 03. Pilot odczytu: health i publiczny SSR

Zależności: 02.

Zakres: `features/health/health-atoms.ts`, `routes/index.tsx`, `routes/-components/home-page.tsx`.

1. Przenieś health do query options i użyj ich w loaderze oraz komponencie.
2. Sprawdź publiczny SSR i hydration z transferem danych właściwym dla Start. Nie serializuj runtime ani klienta API.
3. Dodaj testy równoczesnych konsumentów, retry nieudanego loadera i braku zbędnego requestu po hydration dla świeżych danych.
4. Ustal prosty wzorzec renderowania Query. Wspólny boundary dodaj tylko jeśli upraszcza następne ekrany; bez kopiowania API AsyncResult.
5. Usuń health atom i atom runtime health po migracji wszystkich jego konsumentów.

Odbiór: strona główna działa na pierwszym wejściu i nawigacji klientowej; awaria health nie staje się pustym sukcesem.

### 04. Pilot mutacji: todos

Zależności: 03.

Zakres: `features/todos/todo-atoms.ts`, `routes/dashboard/tasks.tsx`, `routes/dashboard/-components/tasks-page.tsx`.

1. Przenieś listę i create. Przetestuj invalidację oraz błąd odświeżenia po udanym create.
2. Przenieś optimistic toggle i delete, zachowując stan formularza i obsługę błędów.
3. Dodaj testy rollbacku, dwóch szybkich mutacji, opóźnionego GET, odmontowania i izolacji QueryClientów.
4. Zapisz krótki wzorzec query keys, adaptera, mutacji i testów w tym dokumencie. Kolejne zadania mają go stosować bez tworzenia własnych frameworków.

Odbiór: todos w całości bez Atom; sprawdzony wzorzec invalidacji i optimistic updates. To bramka przed masową migracją.

### 05. Users, sesja i reset prywatnego cache

Zależności: 04.

Zakres: `features/users/user-atoms.ts`, konsumenci w waiting room, profilu i tabeli graczy, powiązane loadery oraz ścieżki auth znalezione w 00.

Etap A:

1. Przenieś session, users, verified users i mutacje zarządzania użytkownikami.
2. Zachowaj refresh session/users/verified po odpowiednich zmianach. Odśwież również route context sesji tam, gdzie UI go używa zamiast query.
3. Przenieś pozostałych konsumentów verified users w eventach, nawet jeśli ich inne zasoby nadal używają Atom.

Etap B:

1. Podepnij reset prywatnego cache do właściciela przejść auth ustalonego w 00.
2. Przetestuj logout podczas odczytu, login jako drugi użytkownik, zmianę profilu i ponowną weryfikację Discorda.
3. Sprawdź, że spóźniona odpowiedź starego użytkownika nie przywraca jego danych i że route guards nadal działają.

Odbiór: brak niezależnych, rozjeżdżających się kopii session w UI; drugi użytkownik nie widzi danych pierwszego.

### 06. Announcements

Zależności: 04; po 05, jeśli edycje dotyczą tych samych plików dashboardu.

Zakres: `features/announcements/announcement-atoms.ts`, `routes/dashboard/index.tsx`, announcement page i add modal.

1. Przenieś listę, create i optimistic delete wraz z loaderem.
2. Sprawdź create → lista, rollback delete, uprawnienia i zamknięcie formularza tylko po udanym zapisie.

Odbiór: wszystkie announcement consumers bez Atom, błędy odczytu nie wyglądają jak brak ogłoszeń.

### 07. Legend pricing

Zależności: 04.

Zakres: `features/legend-pricing/legend-pricing-atoms.ts`, `routes/dashboard/cennik.tsx`, `-components/cennik-page.tsx`, `cennik-search.test.tsx`.

1. Przenieś katalog i update ceny, zachowaj `LegendPriceGold` oraz `expectedVersion`.
2. Przetestuj konflikt wersji, walidację kwoty, invalidację i zachowanie wyszukiwania przy refetchu.

Odbiór: brak automatycznego retry konfliktującego zapisu i brak utraty wpisanych danych.

### 08. Auctions

Zależności: 04.

Zakres: `features/auctions/auction-atoms.ts`, jego testy i konsumenci pod `routes/dashboard/auctions/`.

1. Przenieś signups i stats z kluczem zawierającym `type` i `profession`.
2. Przenieś toggle oraz optimistic remove. Odśwież oba zasoby właściwej grupy.
3. Przetestuj dwie grupy, rollback, szybkie działania i nawigację między grupami.

Odbiór: zmiana jednej grupy nie podmienia danych drugiej; stats nie zostają stare po mutacji.

### 09. Skills

Zależności: 04.

Zakres: `features/skills/skill-atoms.ts`, testy, `routes/dashboard/skills/`.

Etap A: ranges, professions, query po slug, listy skills po range ID i odpowiadające loadery. Obsłuż brak range oraz disabled listę bez requestu.

Etap B: create profession/range/skill, optimistic delete range/skill i wszystkie modale. Sprawdź cache listy, szczegółu po slug oraz skills usuniętego range zgodnie z macierzą z 00.

Odbiór: wejście bezpośrednio w range, nieistniejący slug, tworzenie i rollback usuwania mają testy. Etapy A/B mogą przejściowo współdzielić providery wyłącznie zgodnie z zasadą jednego właściciela zasobu.

### 10. Events core i heroes

Zależności: 05.

Zakres: `features/events/core/event-atoms.ts`, `features/events/heroes/hero-atoms.ts`, list/heroes pages, modale, loadery oraz wszyscy konsumenci tych zasobów w eventach.

Etap A: events list oraz create/delete/toggle active i ich konsumenci.

Etap B: heroes list, heroes by event oraz create/delete i ich konsumenci. Przenieś dane list w `use-event-hero-filter.ts` do Query; pozostaw czystą logikę i URL bez zmian. Zaktualizuj typy wyniku hooka oraz konsumentów history/ranking razem.

Odbiór: optimistic rollback działa; create/delete hero odświeża właściwe listy, także listę dla eventu. Niewybrany event nie uruchamia query i nie pokazuje nieskończonego spinnera.

### 11. Bets i historia

Zależności: 10.

Zakres: `features/events/bets/bet-atoms.ts`, jego testy, bets-add oraz history pages/forms/modals.

1. Przenieś paginowane query z pełnym kluczem `eventId`, `heroId`, `limit`, `page` i latest-for-copy.
2. Przeczytaj sposób składania stron w history page przed wyborem zwykłego query lub infinite query. Zachowaj istniejącą paginację i jej reset.
3. Przenieś create/edit/delete. Zachowaj niepuste listy user IDs i branded ID parsing.
4. Uzgodnij invalidację historii, latest-copy i pochodnych rankingów z macierzą z 00. Jeśli ranking jeszcze używa Atom, zastosuj lokalne przejście opisane wcześniej i usuń je w 12.
5. Przetestuj zmianę filtrów podczas requestu, delete na kolejnej stronie, edit członków i copy latest.

Odbiór: brak mieszania stron różnych filtrów i brak starych danych po powrocie do wcześniej oglądanego filtra.

### 12. Ranking i vault

Zależności: 11. Nie uruchamiaj równolegle z 10/11.

Zakres: `features/events/ranking/ranking-atoms.ts`, `features/events/vault/vault-atoms.ts`, testy i konsumenci ranking/vault, w tym `use-ranking-data.ts`, `hero-stats-preview-utils.ts`, distribute modal.

Etap A:

1. Przenieś ranking, hero stats i oldest unpaid. Zastąp fikcyjne hero stats z ID 1 jawnym stanem braku wyboru.
2. Zaktualizuj wszystkich czytelników oldest unpaid, także vault.
3. Usuń tymczasowe odświeżanie atomów z zadania 11.

Etap B:

1. Przenieś vault dla wszystkich eventów i konkretnego eventu.
2. Przenieś distribute gold i optimistic paid-out. Zachowaj powiązania vault → oldest unpaid i uwzględnij pochodne statystyki według kontraktu.
3. Przetestuj wypłatę, rollback paid-out, zmianę najstarszego nieopłaconego eventu i invalidację różnych wariantów vault.

Odbiór: wszystkie moduły events bez Atom, brak retry wypłat, spójne dane po sekwencji bet → ranking → distribute → vault.

### 13. Squad groups jako baza invalidacji

Zależności: 05 i zatwierdzona macierz squad builder z 00.

Zakres: `features/squad-builder/squad-group-atoms.ts`, testy, squads routes/library, editor page oraz available character pool.

Etap A: owned/global groups, detail i available characters. Klucze global lists obejmują name/min/max level. Przenieś wszystkich czytelników, obsłuż invalid ID i brak uprawnień.

Etap B: create/delete/save/save-shared-characters/set-visibility. Zachowaj `expectedUpdatedAt`, role owner/editor i draft editora. Sprawdź, że `Date` przechodzi przez granice bez zmiany kontraktu.

Zastąp `refreshVisibleSquadGroupAtoms` invalidacją Query. Zaktualizuj wywołania ze starych account mutations w tym samym zadaniu przez minimalne jawne podłączenie do routerowego QueryClient, bez globalnego singletonu. Opisz te tymczasowe miejsca do usunięcia w 15/16.

Odbiór: konflikt zapisu nie kasuje szkicu; refetch nie nadpisuje niezapisanej edycji; własne/globalne listy i otwarte szczegóły nie pozostają niespójne po zmianie visibility lub zapisie.

### 14. Squad group sharing

Zależności: 13.

Zakres: `squad-group-sharing-atoms.ts`, `sharing-atoms.test.ts`, group settings i squad invitations.

1. Przenieś incoming invites, shared groups, grants i wyszukiwanie invite targets z query w kluczu.
2. Przenieś send/respond/revoke. Sprawdź rzeczywistych konsumentów prywatnego pending count; nie zachowuj nieużywanego requestu tylko dlatego, że był odświeżany.
3. Przetestuj accept/decline/revoke, zmianę dostępu do detail i available characters oraz odpowiedzi wyszukiwania przy zmianie tekstu.

Odbiór: po cofnięciu dostępu UI nie pokazuje nadal edytowalnego szczegółu z cache.

### 15. Account import i account sharing

Zależności: 13. Sekwencyjnie względem 14, jeśli dotyka wspólnych komponentów.

Te moduły mają wzajemne zależności invalidacji. Nie zlecaj niezależnym agentom ich równoczesnej migracji.

Etap A, przygotowanie odczytów:

1. Przeczytaj `account-import-atoms.ts`, `account-sharing-atoms.ts`, ich testy i wszystkich konsumentów pod `accounts/` oraz accounts page.
2. Przenieś owned/shared accounts, incoming invites, grants i invite-target queries oraz czytelników.
3. W tym samym etapie podłącz pozostające stare mutacje do invalidacji nowych cache. Nie zostawiaj martwych refreshów dawnych atomów.

Etap B, import i zarządzanie:

1. Przenieś preview/confirm import, rename i delete account.
2. Preview jest mutacją uruchamianą przez użytkownika, nie query z automatycznym refetchem. Zachowaj wyniki per-line, partial success i lokalny stan workflow.
3. Delete odświeża owned/shared/invites oraz dotknięte groups/characters zgodnie z macierzą.

Etap C, sharing:

1. Przenieś send/respond/revoke account access i usuń przejściową invalidację z etapu A.
2. Zachowaj izolację aktora obecną w kluczu grants, zgodnie z globalną polityką sesji.
3. Przetestuj accept/decline/revoke i skutki utraty konta dla squad editora.

Odbiór: brak automatycznych kosztownych preview, prawidłowe błędy per-line, brak starych dostępów i postaci po revoke/delete.

### 16. Account refetch

Zależności: 15.

Zakres: `account-refetch-atoms.ts`, jego testy, `accounts/account-refetch-workflow.tsx` i konsumenci.

1. Przenieś preview i apply jako mutacje bez retry. Zachowaj preview ID i etapy workflow.
2. Apply invaliduje owned accounts i dotknięte group detail/available characters, nie tylko listę grup.
3. Usuń pozostałe przejściowe podłączenia squad invalidation z 13.
4. Przetestuj preview failure, apply failure, usunięte postaci, sukces i wyjście z workflow podczas requestu.

Odbiór: wszystkie pięć modułów squad builder bez Atom; refetch nie uruchamia się przez focus, mount ani retry Query.

### 17. Usunięcie infrastruktury Atom

Zależności: wszystkie poprzednie karty zakończone.

1. Powtórz pełny audyt importów, także testów i importów typów. Sprawdź nie tylko `@effect/atom-react`, lecz wszystkie ścieżki reactivity i symbole registry/preload.
2. Usuń `RegistryContext`, `atomRegistry` i `preloadAtomResults` z router context, loaderów oraz fixtures testowych.
3. Usuń pozostałe runtime helpery atomowe, `atom-preload.ts`, `effect-atom-result.ts`, atom-only test utils i stary async boundary, gdy nie mają konsumentów.
4. Przenieś dowody z `atom-preload.test.ts`, `effect-atom-lifecycle.test.ts` i `effect-atom-failure.test.ts` do testów Query. Usuń wyłącznie testy specyficzne dla mechaniki biblioteki, nie wymagania zachowania.
5. Usuń `@effect/atom-react` z manifestu web i zaktualizuj lockfile. Zachowaj `effect` i kontrakty API.
6. Usuń martwe `Data.Class` cache keys i tymczasowe mosty invalidacji. Nie edytuj ręcznie `routeTree.gen.ts`.
7. Sprawdź pozostały stan UI/form/URL. Przenieś tylko faktyczne pozostałości atomów, bez przebudowy działających formularzy i filtrów.

Odbiór: zero użyć Atom, AsyncResult i registry w wykonywalnym kodzie i testach web. Dokumentacja historyczna nie musi być usuwana.

### 18. Końcowa regresja

Zależności: 17.

1. Uruchom pełne kontrole podane niżej oraz build web.
2. Sprawdź pierwsze wejście na publiczną stronę, hydration, wejście bezpośrednim URL do dashboardu, route pending/error/retry i nawigację back/forward.
3. Przejdź login → odczyt prywatnych danych → logout podczas requestu → login jako drugi użytkownik.
4. Sprawdź create/edit/delete, optimistic rollback, szybkie mutacje i awarię refetchu po udanym zapisie.
5. Przejdź events/bets/ranking/vault oraz import/sharing/refetch/squad editor z ich invalidacjami.
6. Sprawdź dostępność komunikatów, disabled controls, zachowanie focusu, formularzy i niezapisanych szkiców.
7. Zapisz rzeczywiste wyniki i blokery. Nie oznaczaj ręcznego scenariusza jako sprawdzonego na podstawie samego linta.

Odbiór: zaakceptowane dowody dla cache, błędów, anulowania, auth i krytycznych workflow. Backend nie został przebudowany.

## Kolejność i równoległość

```text
00 → 01 → 02 → 03 → 04
                       ├→ 05 → 10 → 11 → 12
                       │    └→ 13 → 14 → 15 → 16
                       ├→ 06
                       ├→ 07
                       ├→ 08
                       └→ 09
wszystkie gałęzie → 17 → 18
```

Po pilocie niezależne feature'y mogą pracować równolegle w oddzielnych obszarach plików. Integrator przejmuje zmiany współdzielonych fixtures i dokumentu. Wewnątrz events oraz squad builder zachowaj kolejność. Po każdym etapie A/B cały web ma przechodzić typecheck i odpowiednie testy.

## Walidacja

Z katalogu głównego:

```sh
pnpm check
pnpm --filter web check-types
pnpm --filter web test
```

Dla małego kroku uruchom najpierw właściwe testy Vitest przez `pnpm --filter web test <ścieżka-testu>`, a przed przekazaniem zadania pełny zestaw web. Jeżeli format/lint wymaga poprawki, użyj `pnpm fix` i sprawdź diff pod kątem zmian poza zakresem.

Końcowo:

```sh
pnpm check-types
pnpm test
pnpm --filter web build
pnpm check:unused
```

Porównuj z baseline. `pnpm check` nie sprawdza logiki, UX ani poprawności invalidacji. Testy nie mogą wywoływać prawdziwych płatnych importów/refetchów. Działania zewnętrzne, destrukcyjne i kosztowne wymagają zgody. Nie twórz commitów ani PR bez polecenia.

## Szablon zlecenia dla agenta

```text
Wykonaj wyłącznie kartę <ID>, etap <A/B, jeśli dotyczy>, z
 docs/plans/effect-atom-to-tanstack-query.md.

Najpierw przeczytaj instrukcje repo, zasady techniczne i wspólną instrukcję
wykonania z planu. Potwierdź, że zależności karty są zakończone.
Przeczytaj pełne pliki źródłowe, ich konsumentów i testy.
Stosuj granicę API i wzorzec Query zatwierdzony w pilocie.
Nie zmieniaj backendu, UX, SSR dashboardu ani niezwiązanych feature'ów.
Jeśli potrzebujesz zmienić plik należący do innego aktywnego zadania,
zatrzymaj się i zgłoś konflikt zakresu.

Na koniec podaj:
- wykonane punkty i zmienione pliki;
- query keys i invalidacje;
- uruchomione testy oraz wyniki;
- tymczasowe integracje i kartę ich usunięcia;
- blokery lub niesprawdzone wymagania.
Nie twórz commita ani PR.
```
