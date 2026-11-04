# Backend PERFECTu se Supabase

Spouštěcí bod je `mongo/server.mjs` (`npm start` ve složce `mongo`).
`SUPABASE_DATABASE_URL` zapne PostgreSQL bez připojení k MongoDB. Data zůstávají
v existující tabulce `perfect_import.source_documents`:

| Sloupec | Typ | Obsah |
| --- | --- | --- |
| collection | text | Původní název kolekce |
| document_id | text | Textová podoba původního `_id` |
| document | jsonb | Celý původní dokument včetně `_id` |

Import se neopakuje. Nepoužívej `npm run import` ani `init:clean` pro tento přechod.
Původní příkazy pro import a obnovu MongoDB zůstávají nástroji pro MongoDB.
Alternativní starší vstup `server/main.mjs` používá jiný formát dat a není vstupem
pro tento import ani pro nasazení popsané zde.

## Jednorázová příprava Supabase

1. V SQL Editoru spusť obsah [sql/supabase.sql](sql/supabase.sql).
   Přidá unikátní klíč a indexy. Záznamy nepřepisuje. Zapne RLS a odebere přístup
   rolím `anon` a `authenticated`, protože dokumenty obsahují také účty a interní stav.
   Schéma `perfect_import` nepřidávej do schémat vystavených přes Data API.
2. V **Connect → Session pooler** zkopíruj PostgreSQL URI. Pro Render s IPv4
   používej Session pooler, obvykle port 5432. Nejde o HTTPS adresu projektu ani
   o publishable/anon/service-role API klíč. Heslo v URI musí být URL-encoded.
3. Ulož URI bezpečně do proměnné `SUPABASE_DATABASE_URL` v prostředí serveru.
   Použij databázovou roli s přístupem ke schématu a tabulce; URI z Connect běžně
   používá administrátorskou roli. Přístup je pouze na serveru, nikdy v prohlížeči.
4. Render poskytuje adresu automaticky přes `RENDER_EXTERNAL_URL`.
   Pro vlastní doménu nebo jiný hosting nastav `PUBLIC_ORIGIN` na přesnou HTTPS
   adresu aplikace bez koncového lomítka.
   Při vypnutých oznámeních nastav `PUSH_ENABLED=false`. Pro zapnutá oznámení
   server zachová importované preference a vytvoří klíče, pokud nejsou nastavené.

TLS ověřování je povinné. Pro hostitele `*.supabase.com` a `*.supabase.co`
backend automaticky přidává původní veřejný certifikát Supabase Root 2021 CA
ze souboru `certs/supabase-root-2021.crt` k systémovým důvěryhodným certifikátům.
Ruční Secret File ani `SUPABASE_CA_CERT_PATH` pro Supabase nejsou potřeba;
případná starší hodnota této proměnné se pro tyto hostitele nepoužije.
Pro jiné PostgreSQL hostitele lze vlastní CA zadat přes `SUPABASE_CA_CERT_PATH`.
Ověřování certifikátu ani názvu hostitele se nevypíná.

## Render / běžné spuštění

- Node.js 24 nebo novější.
- Root Directory: `mongo`.
- Build Command: `npm ci`.
- Start Command: `npm start`.
- Health Check Path: `/healthz`.
- Nastav `NODE_ENV=production`; `PORT` poskytuje Render.

Server před spuštěním ověří strukturu tabulky, unikátní klíč, shodu
`document_id` s `document._id` a importovaný řídicí dokument `active` s
`ready=true`, celočíselnou `revision` a `spreadsheetId`. Nenastartuje nad prázdnou
databází. Při nastavené Supabase URI má Supabase přednost před starými MongoDB
proměnnými; chyba připojení nikdy nepřepne server zpět na MongoDB.

Po nasazení ověř `/healthz`, přihlášení původním účtem, přehled zakázek a uložení
jedné kontrolované změny. Ověření na lokální testovací databázi nenahrazuje tento
test nad skutečným importem. Původní fotografie nebyly importovány. Nové nahrávání
fotografií nadále vyžaduje Cloudinary; tato změna fotografie nedoplňuje.

Celý stav, dílčí zápisy a nastavení push používají skutečné SQL transakce a
společný transakční zámek. Změněné dokumenty se zapisují po dávkách, nikoli
přepsáním celé tabulky. Všechny běžící instance musí používat tuto vrstvu;
přímé souběžné úpravy dokumentů v SQL Editoru její zámek nerespektují.
Dočasné záznamy změn a prošlé odběry push se čistí při databázových transakcích.
Případné automatické šifrované zálohy přes `BACKUP_DIR` používají stejný Store.

## Vývoj a ověření bez produkčních přístupových údajů

Používej existující checkout v izolovaném cloudovém úkolu. Nový Git worktree
není potřeba. Z kořene repozitáře:

```sh
cd mongo
npm ci --no-audit --no-fund
npm test
```

Integrační test potřebuje prázdnou lokální PostgreSQL databázi `perfect_test`.
Následující heslo je určeno výhradně pro tuto jednorázovou lokální databázi:

```sh
docker run --name perfect-pg-test --rm -d \
  -p 127.0.0.1:55432:5432 \
  -e POSTGRES_PASSWORD=perfect-local-test \
  -e POSTGRES_DB=perfect_test postgres:17-alpine
# Počkej, až pg_isready uspěje:
docker exec perfect-pg-test pg_isready -U postgres -d perfect_test
PERFECT_TEST_DATABASE_URL=postgresql://postgres:perfect-local-test@127.0.0.1:55432/perfect_test npm run test:postgres
docker stop perfect-pg-test
```

Test vytváří syntetické zakázky a relace. Ověřuje dílčí čtení a zápis, devět
stránek aplikace, konflikty, souběžné transakce, rollback, preference, expiraci
push, skutečné spuštění serveru a HTTP API. Odmítá vzdálenou databázi a existující
schéma `perfect_import`. Pro opakování vytvoř nový prázdný kontejner.
Lokální testování používá `PG_LOCAL_TEST=true` jen pro localhost bez TLS;
v produkci tuto proměnnou nepoužívej. Živé procesy po obnovení cloudového
prostředí nepřetrvávají, test si svůj aplikační proces spouští a ukončuje sám.

## Karty, oznámení a fotografický příjem (oprava 113)

- Karty zákazníků i vozidel zachovávají příznak načtení dat ve všech vrstvách
  otevírání. DOM test otevírá obě karty včetně editace na skutečném HTML aplikace.
- Na Renderu nastav `PUSH_ENABLED=true`. Adresa pro VAPID se nyní přebírá také
  z `RENDER_EXTERNAL_URL`. Klíče jsou uložené v databázi a přežijí restart.
  Zařízení s již uděleným souhlasem obnoví chybějící odběr; při změně klíčů se
  starý odběr nahradí. Pokud prohlížeč požaduje gesto, použij v aplikaci
  **Moje oznámení → Zapnout na tomto zařízení → Test oznámení**.
  Na iPhonu jsou webová push oznámení určena pro aplikaci přidanou na plochu
  (iOS 16.4+). Úspěch serverového odeslání ještě nepotvrzuje zobrazení na telefonu.
  V bezplatném Renderu se služba může uspávat; toto nastavení kód nemění.
- Horní tlačítko i dolní mobilní panel přímo požádají o nativní zachycení obrazu
  ze zadního fotoaparátu. Konkrétní nabídku fotoaparát/galerie řídí prohlížeč.
  Po výběru se zobrazí fotografie a upravitelná pole, volitelný výřez a potvrzení.
  OCR probíhá lokálně, používá upravený kontrast a druhou segmentaci při slabém
  výsledku. Slabě rozpoznané řádky se nepřebírají automaticky. Datum bez roku
  používá viditelně zvolený rok, čas `13h` se rozpozná jako `13:00`.
  Nejde o nový model rozpoznávání rukopisu: těžko čitelný rukopis může stále
  vyžadovat ruční vyplnění. Bez kontroly nelze pokračovat do formuláře objednávky.
