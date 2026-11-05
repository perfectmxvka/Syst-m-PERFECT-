# Gmail → Supabase od 1. 11. 2026

V původním Apps Script projektu nahraď celý obsah těchto dvou souborů verzemi z tohoto balíčku:
- `02_GMAIL_IMPORT.gs`
- `69_MONGO_PREDAVANI_REZERVACI.gs`

Nevytvářej druhé kopie stejných funkcí. Ostatní soubory zůstávají zachované.

## Nastavení

1. Render → Environment: `PERFECT103_SYNC_SECRET` = náhodný klíč alespoň 32 znaků (lze použít Generate). Ulož a nech dokončit deploy.
2. Apps Script → Nastavení projektu → Vlastnosti skriptu:
   - `PERFECT103_MONGO_ORIGIN` = `https://syst-m-perfect.onrender.com`
   - `PERFECT103_SYNC_SECRET` = přesně tentýž klíč z Renderu.
   - Původní `PERFECT_REPAIR_SPREADSHEET_ID` musí dál ukazovat na původní produkční tabulku.
3. Pod Google účtem, kam přicházejí rezervace, spusť `GMAIL_SUPABASE_START_01_11` a povol požadovaný přístup.
4. Spusť `GMAIL_SUPABASE_STAV`. Ve výsledku musí být časovače `gmailCron52_` a `perfect103ForwardCron_`. Historický kurzor postupuje po dnech; `remaining` ukazuje zbývající předávání z tabulky. Protokol importu uvádí i chyby a pozastavené možné duplicity.
5. Ověř jednu konkrétní rezervaci z 1. 11. a jednu novou příchozí rezervaci v nové aplikaci, včetně data, času a kontaktu.

## Chování

Hranice znamená datum doručení e-mailu od 1. 11. 2026 včetně, v pásmu Europe/Prague; není to datum návštěvy. Gmail se kontroluje každou minutu a předávání běží každých 5 minut. Historie pokračuje po dávkách, zatímco se zpracovávají i nové zprávy. Volný Render může při probouzení způsobit zpoždění; neúspěšná dávka se zopakuje.

Podpis a odpověď backendu se ověřují před instalací časovačů. Potvrzení dávky se ukládá až po potvrzení všech jejích objednávek. Deduplikace cíle používá GMAIL_MESSAGE_ID. Starší objednávky ani změny v Supabase se touto cestou nepřepisují. Neshoda čísla objednávky zastaví dávku s chybou, nepřepíše cizí objednávku.

Zůstávají původní ochrany importu: přesný rozpoznaný předmět rezervace, seznam blokovaných kontaktů, pozastavení podobných rezervací a opakování chyb parseru. Ne každá zpráva v Gmailu je objednávka. Chybějící nebo smazanou zprávu nelze časově ověřit, zůstane k opakování s hláškou. Stav bez chyb a kontrola konkrétních rezervací jsou nutné pro potvrzení ostrého provozu.

Změna kódu na GitHubu sama neaktualizuje původní Apps Script. Klíč neposílej do chatu ani neukládej do zdrojového kódu.
