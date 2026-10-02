UPDATE users SET featured_skin_id = NULL
WHERE featured_skin_id IN (SELECT id FROM skins WHERE kind <> 'full');
