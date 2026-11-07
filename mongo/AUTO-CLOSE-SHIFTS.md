# Automatické potvrzení směn

Server každý den od 20:15 v zóně Europe/Prague potvrdí aktivní přiřazené směny BOX1 a BOX2. Kontrola běží při startu a každou minutu; aplikace nemusí být otevřená. Letní a zimní čas se přepíná automaticky. DETAILING ani prázdné boxy se nepotvrzují.

Zachová se přiřazený zaměstnanec, bonusy a stávající výpočet odměny. Zápis používá stávající databázovou funkci s kontrolou verze a auditem (aktor SYSTEM_AUTO_CLOSE_20_15). Směny i denní značky dokončení se ukládají v jedné transakci. Opakování po restartu nevytváří duplicity ani nepřepisuje následné ruční opravy.

Po nasazení změny stačí běžící Node server (`mongo/server.mjs`); externí cron není potřeba. Host musí běžet i večer. Při výpadku se pokus opakuje každou minutu a při restartu ještě tentýž den po 20:15. Celodenní výpadek se automaticky nedoplňuje zpětně, aby se nepotvrzovaly historické směny bez kontroly.

Ověření: `node mongo/test/auto-close-shifts.test.mjs`.
