# Oprava 115

- Automatické dokončování zakázek po příjezdu + délce programu běží každou minutu na serveru i bez otevřeného prohlížeče. Používá dosavadní pravidla aplikace a doplní dosud čekající zakázky s uplynulým platným termínem.
- Potvrzení směny v boxu dokončí jeho přiřazené čekající zakázky. Stavy zrušeno a nedorazil se nepřepisují.
- Účet vlastníka je svázaný s ověřeným trvalým ID. Ostatním účtům včetně jiných superadminů se nevrací jeho identita, osobní směny, výdělky ani uživatelský audit; přímé dotazy na jeho ID jsou odmítnuté. Vlastník si vlastní profil zobrazit může. Nejde o odstranění databázových záznamů, záloh ani provozních logů hostingu.
- Správa uživatelů má tlačítko Odstranit účet: vypne přístup, odhlásí relace a odebere účet ze seznamu správy. Historické účetní záznamy zůstávají zachované. Vlastní účet a účet vlastníka odstranit nelze.
- Automatizace vyžadují běžící Node server. Při zastaveném hostu neběží.

Ověření: `cd mongo && npm test`. Testy pokrývají výpočty, načítání dat, API oprávnění, zakázky, karty zákazníků a vozidel, OCR, oznámení a nové automatické uzavírání. Nejde o záruku všech kombinací ostrých dat.

Po nasazení musí `/healthz` vracet build `PERFECT-2026-11-07-115`.
