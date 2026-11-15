-- Eggly – låsning av rättigheter (fas 0)
-- Supabase kan ge Data API-rollerna fulla rättigheter på nya tabeller automatiskt
-- ("Automatically expose new tables"). För Eggly gäller: anon når ingenting, authenticated får bara läsa,
-- och all skrivning går via serverfunktionerna. Radnivåskyddet stoppar ändå skrivningar,
-- men rättigheterna ska stämma med avsikten.

revoke all on all tables in schema eggly from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema eggly from authenticated;
revoke all on all sequences in schema eggly from anon, authenticated;
revoke select on eggly.login_attempts, eggly.item_stats from authenticated;

alter default privileges in schema eggly revoke all on tables from anon, authenticated;
alter default privileges in schema eggly revoke all on sequences from anon, authenticated;
alter default privileges in schema eggly revoke execute on functions from anon;
